# 🏦 Full Stack Assignment: Bank Loan System + Algorithmic Problems

This project contains two parts bundled in a single Express.js backend:

1. ✅ **Bank Loan System REST API** — to simulate a bank's loan and payment system  
2. ✅ **Algorithmic Problem Solutions** — implemented directly within `app.js`

---

## 📌 Part 1: Bank Loan System (RESTful API)

### 🔧 Tech Stack
- **Node.js + Express**
- **SQLite (file-based database)**
- **UUID for unique IDs**

### 📚 Features Implemented

| Endpoint                           | Description                                               |
|------------------------------------|-----------------------------------------------------------|
| `POST /api/loans`                  | Create a loan (LEND)                                      |
| `POST /api/loans/:id/payments`     | Make a payment (EMI/Lump sum)                             |
| `GET /api/loans/:id/ledger`        | View ledger for a loan                                    |
| `GET /api/customers/:id/overview`  | View all loans of a customer                              |

---

## 🧪 API Testing (Use Postman)

### ✅ 1. LEND - Create Loan
```http
POST http://localhost:3000/api/loans
Content-Type: application/json

{
  "customer_id": "cust001",
  "loan_amount": 50000,
  "duration_years": 2,
  "interest_rate": 10
}
✅ 2. PAYMENT - Make EMI / Lump Sum Payment
http
Copy
Edit
POST http://localhost:3000/api/loans/<loan_id>/payments
Content-Type: application/json

{
  "amount": 2500,
  "payment_type": "EMI"
}
✅ 3. LEDGER
http
Copy
Edit
GET http://localhost:3000/api/loans/<loan_id>/ledger
✅ 4. ACCOUNT OVERVIEW
http
Copy
Edit
GET http://localhost:3000/api/customers/cust001/overview
📌 Part 2: Algorithmic Problem Solutions
All problem-solving logic is implemented in the bottom section of app.js under clearly marked function names.

✅ 1. Caesar Cipher (Encryption/Decryption)
Function: caesarCipher(text, shift, mode = 'encode')

js
Copy
Edit
caesarCipher("Hello", 3);           // => Khoor
caesarCipher("Khoor", 3, "decode"); // => Hello
✅ 2. Indian Currency Format
Function: indianCurrencyFormat(number)

js
Copy
Edit
indianCurrencyFormat(123456.7891);  // => "1,23,456.7891"
✅ 3. Combine Lists by Overlapping Positions
Function: combineLists(list1, list2)

js
Copy
Edit
combineLists(
  [{ positions: [0, 5], values: [1, 2] }],
  [{ positions: [3, 7], values: [3, 4] }]
);
✅ 4. Minimize Loss on House Prices
Function: minimizeLoss(prices)

js
Copy
Edit
minimizeLoss([20, 15, 7, 2, 13]);
// => { buyYear: 2, sellYear: 5, minLoss: 2 }
🚀 How to Run Locally
1. Clone and Install
bash
Copy
Edit
git clone https://github.com/<your-username>/bank-loan-system.git
cd bank-loan-system
npm install
2. Start Server
bash
Copy
Edit
node app.js
Server will run at:
👉 http://localhost:3000#   A g e t w a r e - a s s i g m e n t 
 
 