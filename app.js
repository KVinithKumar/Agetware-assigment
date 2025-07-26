// File: app.js

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const app = express();
const PORT = 3000;

app.use(express.json());

// Database Setup
const db = new sqlite3.Database("./bank.db", (err) => {
  if (err) return console.error("Database opening error:", err.message);
  console.log("Connected to SQLite database");
});

// Create Tables
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

// Loan Calculation Function
function calculateLoan(P, N, R) {
  const interest = P * N * (R / 100);
  const total = P + interest;
  const emi = total / (N * 12);
  return { total, emi };
}

// LEND: Create a Loan
app.post("/api/loans", (req, res) => {
  const { customer_id, loan_amount, duration_years, interest_rate } = req.body;
  if (!customer_id || !loan_amount || !duration_years || !interest_rate) {
    return res.status(400).json({ error: "Missing fields in request." });
  }
  const { total, emi } = calculateLoan(loan_amount, duration_years, interest_rate);
  const loan_id = uuidv4();
  const query = `INSERT INTO Loans (loan_id, customer_id, principal_amount, total_amount, interest_rate, loan_period_years, monthly_emi, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`;

  db.run(
    query,
    [loan_id, customer_id, loan_amount, total, interest_rate, duration_years, emi],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ loan_id, customer_id, total_amount: total, monthly_emi: emi });
    }
  );
});

// PAYMENT
app.post("/api/loans/:loan_id/payments", (req, res) => {
  const { amount, payment_type } = req.body;
  const { loan_id } = req.params;
  if (!amount || !payment_type) return res.status(400).json({ error: "Invalid payment input" });

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

// LEDGER
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

// ACCOUNT OVERVIEW
app.get("/api/customers/:customer_id/overview", (req, res) => {
  const { customer_id } = req.params;
  db.all("SELECT * FROM Loans WHERE customer_id = ?", [customer_id], (err, loans) => {
    if (err || loans.length === 0) return res.status(404).json({ error: "No loans found" });

    const loanPromises = loans.map((loan) => {
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

    Promise.all(loanPromises).then((overview) => {
      res.json({ customer_id, total_loans: overview.length, loans: overview });
    });
  });
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
