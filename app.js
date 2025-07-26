const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const app = express();
const PORT = 3000;

app.use(express.json());

//  Database Setup
const db = new sqlite3.Database("./bank.db", (err) => {
  if (err) return console.error("Database error:", err.message);
  console.log("Connected to SQLite DB");
});

const createTables = () => {
  db.run(`CREATE TABLE IF NOT EXISTS Customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Loans (
    loan_id TEXT PRIMARY KEY,
    customer_id TEXT,
    principal_amount REAL,
    total_amount REAL,
    interest_rate REAL,
    loan_period_years INTEGER,
    monthly_emi REAL,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES Customers(customer_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Payments (
    payment_id TEXT PRIMARY KEY,
    loan_id TEXT,
    amount REAL,
    payment_type TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(loan_id) REFERENCES Loans(loan_id)
  )`);
};
createTables();

//  Loan Calculations
function calculateLoan(P, N, R) {
  const interest = P * N * (R / 100);
  const total = P + interest;
  const emi = total / (N * 12);
  return { total, emi };
}

//  LEND API
app.post("/api/loans", (req, res) => {
  const { customer_id, loan_amount, duration_years, interest_rate } = req.body;
  if (!customer_id || !loan_amount || !duration_years || !interest_rate) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const { total, emi } = calculateLoan(loan_amount, duration_years, interest_rate);
  const loan_id = uuidv4();

  db.run(
    `INSERT INTO Loans (loan_id, customer_id, principal_amount, total_amount, interest_rate, loan_period_years, monthly_emi, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [loan_id, customer_id, loan_amount, total, interest_rate, duration_years, emi],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ loan_id, customer_id, total_amount: total, monthly_emi: emi });
    }
  );
});

//  PAYMENT API
app.post("/api/loans/:loan_id/payments", (req, res) => {
  const { amount, payment_type } = req.body;
  const { loan_id } = req.params;

  if (!amount || !payment_type) return res.status(400).json({ error: "Invalid input" });

  db.get("SELECT * FROM Loans WHERE loan_id = ?", [loan_id], (err, loan) => {
    if (err || !loan) return res.status(404).json({ error: "Loan not found" });

    const payment_id = uuidv4();
    db.run(
      `INSERT INTO Payments (payment_id, loan_id, amount, payment_type) VALUES (?, ?, ?, ?)`,
      [payment_id, loan_id, amount, payment_type],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.get(`SELECT SUM(amount) AS paid FROM Payments WHERE loan_id = ?`, [loan_id], (err, row) => {
          const paid = row?.paid || 0;
          const balance = loan.total_amount - paid;
          const emis_left = Math.ceil(balance / loan.monthly_emi);

          res.json({
            payment_id,
            message: "Payment Successful",
            remaining_balance: balance,
            emis_left,
          });
        });
      }
    );
  });
});

//  LEDGER API
app.get("/api/loans/:loan_id/ledger", (req, res) => {
  const { loan_id } = req.params;

  db.get("SELECT * FROM Loans WHERE loan_id = ?", [loan_id], (err, loan) => {
    if (err || !loan) return res.status(404).json({ error: "Loan not found" });

    db.all(`SELECT * FROM Payments WHERE loan_id = ?`, [loan_id], (err, payments) => {
      db.get(`SELECT SUM(amount) AS paid FROM Payments WHERE loan_id = ?`, [loan_id], (err, row) => {
        const paid = row?.paid || 0;
        const balance = loan.total_amount - paid;
        const emis_left = Math.ceil(balance / loan.monthly_emi);

        res.json({
          loan_id,
          customer_id: loan.customer_id,
          principal_amount: loan.principal_amount,
          total_amount: loan.total_amount,
          monthly_emi: loan.monthly_emi,
          paid,
          balance,
          emis_left,
          payments,
        });
      });
    });
  });
});

//  ACCOUNT OVERVIEW API
app.get("/api/customers/:customer_id/overview", (req, res) => {
  const { customer_id } = req.params;

  db.all("SELECT * FROM Loans WHERE customer_id = ?", [customer_id], (err, loans) => {
    if (err || loans.length === 0) return res.status(404).json({ error: "No loans found" });

    const overview = loans.map((loan) => {
      return new Promise((resolve) => {
        db.get(`SELECT SUM(amount) AS paid FROM Payments WHERE loan_id = ?`, [loan.loan_id], (err, row) => {
          const paid = row?.paid || 0;
          const interest = loan.total_amount - loan.principal_amount;
          resolve({
            loan_id: loan.loan_id,
            principal: loan.principal_amount,
            total_amount: loan.total_amount,
            interest,
            emi: loan.monthly_emi,
            amount_paid: paid,
            emis_left: Math.ceil((loan.total_amount - paid) / loan.monthly_emi),
          });
        });
      });
    });

    Promise.all(overview).then((loansData) => {
      res.json({ customer_id, total_loans: loansData.length, loans: loansData });
    });
  });
});


// ===========================
//  UTILITY FUNCTION ROUTES
// ===========================

//  Caesar Cipher
function caesarCipher(text, shift, mode = 'encode') {
  let result = '';
  shift = shift % 26;
  if (mode === 'decode') shift = -shift;
  for (let char of text) {
    if (char.match(/[a-zA-Z]/)) {
      const base = char === char.toUpperCase() ? 65 : 97;
      result += String.fromCharCode((char.charCodeAt(0) - base + shift + 26) % 26 + base);
    } else {
      result += char;
    }
  }
  return result;
}

app.post("/api/caesar", (req, res) => {
  const { message, shift, mode } = req.body;
  if (!message || typeof shift !== "number") return res.status(400).json({ error: "Invalid input" });
  const result = caesarCipher(message, shift, mode || "encode");
  res.json({ result });
});

// Indian Currency Format
function indianCurrencyFormat(number) {
  const numStr = number.toString().split(".");
  let intPart = numStr[0];
  let decPart = numStr.length > 1 ? "." + numStr[1] : "";
  let lastThree = intPart.slice(-3);
  let rest = intPart.slice(0, -3);
  if (rest !== '') lastThree = ',' + lastThree;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest + lastThree + decPart;
}

app.post("/api/indian-format", (req, res) => {
  const { number } = req.body;
  if (typeof number !== "number") return res.status(400).json({ error: "Invalid number" });
  const formatted = indianCurrencyFormat(number);
  res.json({ formatted });
});

//Combine Lists
function combineLists(list1, list2) {
  const combined = [...list1, ...list2].sort((a, b) => a.positions[0] - b.positions[0]);
  const result = [];
  for (let item of combined) {
    if (!result.length) {
      result.push(item);
      continue;
    }
    const prev = result[result.length - 1];
    const [l1, r1] = prev.positions;
    const [l2, r2] = item.positions;
    const overlap = Math.max(0, Math.min(r1, r2) - Math.max(l1, l2));
    const len2 = r2 - l2;
    if (overlap >= len2 / 2) {
      prev.values = prev.values.concat(item.values);
      prev.positions[1] = Math.max(r1, r2);
    } else {
      result.push(item);
    }
  }
  return result;
}

app.post("/api/combine-lists", (req, res) => {
  const { list1, list2 } = req.body;
  if (!Array.isArray(list1) || !Array.isArray(list2)) return res.status(400).json({ error: "Invalid lists" });
  const combined = combineLists(list1, list2);
  res.json({ combined });
});

// Minimize Loss
function minimizeLoss(prices) {
  let minLoss = Infinity;
  let buyYear = -1;
  let sellYear = -1;
  for (let i = 0; i < prices.length; i++) {
    for (let j = i + 1; j < prices.length; j++) {
      if (prices[j] < prices[i]) {
        const loss = prices[i] - prices[j];
        if (loss < minLoss) {
          minLoss = loss;
          buyYear = i + 1;
          sellYear = j + 1;
        }
      }
    }
  }
  return { buyYear, sellYear, minLoss };
}

app.post("/api/minimize-loss", (req, res) => {
  const { prices } = req.body;
  if (!Array.isArray(prices)) return res.status(400).json({ error: "Invalid prices" });
  const result = minimizeLoss(prices);
  res.json(result);
});

//  Start Server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
