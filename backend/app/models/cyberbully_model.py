import torch
import torch.nn as nn
from transformers import AutoModel


class AttentionLayer(nn.Module):
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attn = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        score  = self.attn(x).squeeze(-1)                    # (batch, seq)
        weight = torch.softmax(score, dim=1).unsqueeze(-1)   # (batch, seq, 1)
        return (x * weight).sum(dim=1)                       # (batch, hidden_dim)


class CyberbullyMultiTask(nn.Module):
    def __init__(self, model_name: str = "indolem/indobertweet-base-uncased"):
        super().__init__()
        self.bert   = AutoModel.from_pretrained(model_name)
        self.bigru  = nn.GRU(
            input_size=768, hidden_size=128,
            num_layers=2, batch_first=True,
            bidirectional=True, dropout=0.3,
        )
        self.attn   = AttentionLayer(256)
        self.tkd_fc = nn.Sequential(
            nn.Linear(1, 32), nn.ReLU(), nn.Dropout(0.3)
        )
        self.dropout = nn.Dropout(0.3)

        # 256 (BiGRU output) + 32 (TKD projected) = 288
        self.task1 = nn.Sequential(
            nn.Linear(288, 128), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(128, 2),
        )
        self.task2 = nn.Sequential(
            nn.Linear(288, 128), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(128, 3),
        )

    def forward(self, input_ids, attention_mask, toxic):
        # toxic shape: (batch, 1)
        bert_out      = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        seq_out       = bert_out.last_hidden_state          # (batch, seq, 768)
        gru_out, _    = self.bigru(seq_out)                 # (batch, seq, 256)
        ctx           = self.attn(gru_out)                  # (batch, 256)
        tkd_feat      = self.tkd_fc(toxic)                  # (batch, 32)
        combined      = self.dropout(torch.cat([ctx, tkd_feat], dim=1))  # (batch, 288)
        return self.task1(combined), self.task2(combined)
