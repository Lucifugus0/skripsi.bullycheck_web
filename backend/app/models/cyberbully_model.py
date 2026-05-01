import torch
import torch.nn as nn
from transformers import AutoModel


class AttentionLayer(nn.Module):
    def __init__(self, hidden_size: int):
        super().__init__()
        self.attn = nn.Linear(hidden_size, 1)

    def forward(self, hidden_states):
        # hidden_states: (batch, seq_len, hidden_size)
        scores = self.attn(hidden_states).squeeze(-1)          # (batch, seq_len)
        weights = torch.softmax(scores, dim=-1)                # (batch, seq_len)
        context = (hidden_states * weights.unsqueeze(-1)).sum(dim=1)  # (batch, hidden_size)
        return context, weights


class CyberbullyModel(nn.Module):
    def __init__(
        self,
        model_name: str = "indolem/indobertweet-base-uncased",
        gru_hidden: int = 256,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        bert_hidden = self.bert.config.hidden_size  # 768

        self.bigru = nn.GRU(
            input_size=bert_hidden,
            hidden_size=gru_hidden,
            num_layers=1,
            batch_first=True,
            bidirectional=True,
        )
        bigru_out = gru_hidden * 2  # 512

        self.attention = AttentionLayer(bigru_out)
        self.dropout = nn.Dropout(dropout)

        combined = bigru_out + 1  # +1 for TKD scalar

        self.task1_head = nn.Sequential(
            nn.Linear(combined, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 2),
        )
        self.task2_head = nn.Sequential(
            nn.Linear(combined, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 3),
        )

    def forward(self, input_ids, attention_mask, tkd):
        bert_out = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        sequence_output = bert_out.last_hidden_state          # (batch, seq, 768)

        gru_out, _ = self.bigru(sequence_output)              # (batch, seq, 512)
        context, _ = self.attention(gru_out)                  # (batch, 512)

        tkd = tkd.unsqueeze(-1).float()                       # (batch, 1)
        combined = torch.cat([context, tkd], dim=-1)          # (batch, 513)
        combined = self.dropout(combined)

        logits_t1 = self.task1_head(combined)                 # (batch, 2)
        logits_t2 = self.task2_head(combined)                 # (batch, 3)
        return logits_t1, logits_t2
