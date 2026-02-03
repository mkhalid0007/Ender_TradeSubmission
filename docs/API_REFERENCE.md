# API Reference

Quick reference for all external API endpoints used by the application.

---

## Base URLs

| Service | URL |
|---------|-----|
| Ender API | `https://futures.gbe.energy/ender` |
| Reporting API | `https://futures.gbe.energy/reporting` |

---

## Authentication

All requests require authentication via headers:

| API | Header | Value |
|-----|--------|-------|
| Ender | `Trader-Token` | User's trader token |
| Reporting | `Trade-Token` | User's trader token |

---

## Trade Submission Endpoints

### Submit Virtual Trades

```http
POST /api/v1/trades/pjm/virtuals
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD
  Content-Type: application/json

Body:
{
  "trades": [
    {
      "location": "51288",
      "increments": [
        { "hour": 1, "price": 25.50, "mw": 10 },
        { "hour": 2, "price": 26.00, "mw": 10 }
      ],
      "decrements": [
        { "hour": 3, "price": 20.00, "mw": 5 }
      ]
    }
  ]
}

Response: 200 OK
```

### Replace Virtual Trades

```http
PUT /api/v1/trades/pjm/virtuals
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD
  Content-Type: application/json

Body: Same as POST

Response: 200 OK
```

### Delete Virtual Trades

```http
DELETE /api/v1/trades/pjm/virtuals
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD

Response: 200 OK
```

### Submit UTC Trades

```http
POST /api/v1/trades/pjm/utc
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD
  Content-Type: application/json

Body:
{
  "trades": [
    {
      "sourceLocation": "51288",
      "sinkLocation": "51217",
      "hours": [
        { "hour": 1, "price": 5.00, "mw": 10 },
        { "hour": 2, "price": 6.00, "mw": 10 }
      ]
    }
  ]
}

Response: 200 OK
```

### Replace UTC Trades

```http
PUT /api/v1/trades/pjm/utc
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD
  Content-Type: application/json

Body: Same as POST

Response: 200 OK
```

### Delete UTC Trades

```http
DELETE /api/v1/trades/pjm/utc
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD

Response: 200 OK
```

---

## Trade Retrieval Endpoints

### Get Submitted Virtual Trades

```http
GET /api/v1/trades/virtuals
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD

Response:
[
  {
    "id": "abc123",
    "enderTxnId": "txn456",
    "tradeDate": "2026-02-05",
    "location": "51288",
    "type": "INC",
    "hour": 1,
    "price": 25.50,
    "mw": 10,
    "traderId": "trader@example.com"
  }
]
```

### Get Submitted UTC Trades

```http
GET /api/v1/trades/utc
Headers:
  Trader-Token: <token>
  Trade-Date: YYYY-MM-DD

Response:
[
  {
    "id": "def456",
    "enderTxnId": "txn789",
    "tradeDate": "2026-02-05",
    "sourceLocation": 51288,
    "sinkLocation": 51217,
    "hour": 1,
    "price": 5.00,
    "mw": 10,
    "traderId": "trader@example.com"
  }
]
```

---

## Cleared/Settled Trades Endpoints

### Get Cleared Virtual Trades

```http
GET /api/v1/pjm/virtuals/trades?status=cleared&tradeDate=YYYY-MM-DD
Headers:
  Trade-Token: <token>

Response:
[
  {
    "id": 1,
    "tradeId": "abc123",
    "enderTxnId": "txn456",
    "tradeDate": "2026-02-05",
    "location": "51288",
    "type": "INC",
    "hour": 1,
    "price": 25.50,
    "mw": 10,
    "traderId": "trader@example.com",
    "status": "CLEARED",
    "daLmp": 30.25
  }
]
```

### Get Settled Virtual Trades

```http
GET /api/v1/pjm/virtuals/trades?status=settled&tradeDate=YYYY-MM-DD
Headers:
  Trade-Token: <token>

Response:
[
  {
    "id": 1,
    "tradeId": "abc123",
    "enderTxnId": "txn456",
    "tradeDate": "2026-02-05",
    "traderId": "trader@example.com",
    "pnodeId": 51288,
    "tradeType": "INC",
    "hour": 1,
    "submittedPrice": 25.50,
    "clearedMw": 10,
    "daLmp": 30.25,
    "totalLmpRt": 28.00,
    "priceDiff": 2.25,
    "pnl": 22.50,
    "createdAt": "2026-02-04T10:00:00Z"
  }
]
```

### Get Cleared UTC Trades

```http
GET /api/v1/pjm/utc/trades?status=cleared&tradeDate=YYYY-MM-DD
Headers:
  Trade-Token: <token>

Response:
[
  {
    "id": 1,
    "tradeId": "def456",
    "enderTxnId": "txn789",
    "tradeDate": "2026-02-05",
    "sourceLocation": 51288,
    "sinkLocation": 51217,
    "hour": 1,
    "price": 5.00,
    "mw": 10,
    "traderId": "trader@example.com",
    "status": "CLEARED",
    "daSpread": 4.50
  }
]
```

### Get Settled UTC Trades

```http
GET /api/v1/pjm/utc/trades?status=settled&tradeDate=YYYY-MM-DD
Headers:
  Trade-Token: <token>

Response:
[
  {
    "id": 1,
    "tradeId": "def456",
    "tradeDate": "2026-02-05",
    "traderId": "trader@example.com",
    "sourceLocation": 51288,
    "sinkLocation": 51217,
    "hour": 1,
    "submittedPrice": 5.00,
    "clearedMw": 10,
    "daSpread": 4.50,
    "rtSpread": 6.00,
    "spreadDiff": 1.50,
    "pnl": 15.00,
    "createdAt": "2026-02-04T10:00:00Z"
  }
]
```

---

## PnL Endpoints

### Get PnL Data

```http
GET /api/v1/reporting/pnl/{market}/{period}?leaderboard={true|false}
Headers:
  Trade-Token: <token>

Path Parameters:
  market: virtuals | utc
  period: daily | weekly | monthly | alltime

Query Parameters:
  leaderboard: true | false (include rankings)

Response (leaderboard=false):
{
  "realizedPnl": 1250.50,
  "market": "virtuals",
  "period": "daily"
}

Response (leaderboard=true):
{
  "realizedPnl": 1250.50,
  "market": "virtuals",
  "period": "daily",
  "rows": [
    {
      "rank": 1,
      "traderEmail": "top@trader.com",
      "realizedPnl": 5000.00
    },
    {
      "rank": 2,
      "traderEmail": "you@example.com",
      "realizedPnl": 1250.50
    }
  ]
}
```

---

## Notes Endpoints

### Get Notes

```http
GET /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD
Headers:
  Trade-Token: <token>

Path Parameters:
  market: pjm
  type: virtual | utc

Response:
{
  "market": "pjm",
  "type": "virtual",
  "tradeDate": "2026-02-05",
  "notes": {
    "thesis": "Expecting high RT prices due to cold weather",
    "INC_HE3-4_morning": "Morning thesis rationale"
  }
}
```

### Save Notes

```http
POST /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD
Headers:
  Trade-Token: <token>
  Content-Type: application/json

Path Parameters:
  market: pjm
  type: virtual | utc

Body:
[
  { "tag": "thesis", "text": "My trading rationale" },
  { "tag": "INC_HE3-4", "text": "Morning hours note" }
]

Response: 200 OK
```

### Delete Note

```http
DELETE /api/v1/reporting/notes/{market}/{type}?tradeDate=YYYY-MM-DD&tag={tag}
Headers:
  Trade-Token: <token>

Path Parameters:
  market: pjm
  type: virtual | utc

Query Parameters:
  tradeDate: YYYY-MM-DD
  tag: note tag to delete

Response: 200 OK
```

---

## Node Endpoints

### Get Virtual Nodes

```http
GET /api/incdec/valid-nodes
Headers:
  Trader-Token: <token>

Response:
{
  "nodes": [
    { "id": "51288", "name": "WESTERN HUB" },
    { "id": "51217", "name": "EASTERN HUB" }
  ]
}
```

### Get UTC Nodes

```http
GET /api/utc/valid-nodes
Headers:
  Trader-Token: <token>

Response:
{
  "nodes": [
    { "id": "51288", "name": "WESTERN HUB" },
    { "id": "51217", "name": "EASTERN HUB" }
  ]
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid trade data",
  "details": "MW must be greater than 0"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token"
}
```

### 404 Not Found

```json
{
  "error": "No trades found for the specified date"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## Status Values

### Trade Status

| Status | Description |
|--------|-------------|
| `PENDING` | Submitted, awaiting market clearing |
| `CLEARED` | Cleared in Day-Ahead market |
| `REJECTED` | Rejected by market |
| `SETTLED` | Settled with RT prices, PnL calculated |

### Trade Types

| Type | Description |
|------|-------------|
| `INC` | Increment - Short DA (Sell DA, Buy RT) |
| `DEC` | Decrement - Long DA (Buy DA, Sell RT) |
