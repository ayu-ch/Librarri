const express = require("express");
// const pool = require("../database")
const bcrypt = require("bcryptjs")
const { v4: uuidv4 } = require("uuid");
const { hashPassword, setUser, getUser, isAdmin } = require('../service/auth')
const router = express.Router();
const jwt = require('jsonwebtoken');
const secret = "hello"

const mysql = require('mysql2')
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB,
}).promise()

router.get("/", (req, res) => {
  return res.render("signup")
})

router.post("/", async (req, res) => {
  const { name, password } = req.body;
  try {
    const { hash } = await hashPassword(password);
    const sql = "INSERT INTO User (Username, Pass, Role) VALUES (?, ?, ?)";
    await pool.query(sql, [name, hash, "Client"]);
    console.log("User added to database");
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error inserting user into database");
  }
})

router.get("/login", (req, res) => {
  return res.render("login")
})

router.post('/login', async (req, res) => {
  const { name, password } = req.body;
  try {

    const [results] = await pool.query('SELECT * FROM User WHERE Username = ? AND Role = "Client"', [name]);

    console.log(results)
    if (results.length === 0) {
      return res.status(401).send("Username or password incorrect");
    }

    const { Pass } = results[0];

    const isPasswordValid = await bcrypt.compare(password, Pass);

    if (!isPasswordValid) {
      return res.status(401).send("Username or password incorrect");
    }
    const role = await pool.query('SELECT Role FROM User WHERE Username = ?', [name]);
    const user = {
      username: name,
      role: "Client"
    }

    const token = setUser(user);
    res.cookie("uid", token);
    res.redirect("/home");

  } catch (error) {
    console.error(error);
    return res.status(500).send("Error retrieving user from database");
  }
});

router.get("/home", (req, res) => {
  return res.render("home")
})

router.get("/admin", isAdmin, (req, res) => {
  return res.render("adminPortal");
})


router.get("/admin/login", (req, res) => {
  return res.render("adminLogin")
})

router.post('/admin/login', async (req, res) => {
  const { name, password } = req.body;
  try {

    const [results] = await pool.query('SELECT * FROM User WHERE Username = ? AND Role = "Admin"', [name]);

    console.log(results)
    if (results.length === 0) {
      return res.status(401).send("Username or password incorrect");
    }

    const { Pass } = results[0];

    const isPasswordValid = await bcrypt.compare(password, Pass);

    if (!isPasswordValid) {
      return res.status(401).send("Username or password incorrect");
    }
    const role = await pool.query('SELECT Role FROM User WHERE Username = ?', [name]);
    const user = {
      username: name,
      role: "Admin"
    }

    const token = setUser(user);
    res.cookie("uid", token);
    res.redirect("/admin");

  } catch (error) {
    console.error(error);
    return res.status(500).send("Error retrieving user from database");
  }
});

router.get("/home/request", async (req, res) => {
  async function getBooks() {
    try {
      const [rows, fields] = await pool.query('SELECT * FROM Books');
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const books = await getBooks();
    res.render('requestBooks.ejs', { books: books });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }

})

router.post("/home/request", async (req, res) => {
  const selectedBooks = req.body.selectedBooks;
  token = req.cookies.uid;
  const decoded = jwt.verify(token, secret);
  const name = decoded.username;
  const [user] = await pool.query('SELECT UserID FROM User WHERE Username = ?', [name]);
  const UserID = user[0].UserID;
  console.log(UserID);

  try {
    for (const BookID of selectedBooks) {
      try {
        const sql = "INSERT INTO BookRequests (UserID, BookID) VALUES (?, ?)";
        await pool.query(sql, [UserID, BookID]);
        console.log("Book added to database");
      } catch (error) {
        console.error(error);
        return res.status(500).send("Error inserting user into database");
      }
    }

    res.redirect("/home/requests");
  } catch (error) {
    console.error(error);
    res.status(500).send('BookID Error');
  }
})

router.get("/home/requests", async (req, res) => {

  token = req.cookies.uid;
  const decoded = jwt.verify(token, secret);
  const name = decoded.username;
  const [user] = await pool.query('SELECT UserID FROM User WHERE Username = ?', [name]);
  const UserID = user[0].UserID;
  async function getRequests() {
    try {
      const [rows, fields] = await pool.query('SELECT * FROM BookRequests WHERE UserID = ?', [UserID]);
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const requests = await getRequests();

    if (requests.length > 0) {
      const BookIDs = requests.map(request => request.BookID);
      console.log(BookIDs);
      token = req.cookies.uid;
      const decoded = jwt.verify(token, secret);
      const name = decoded.username;
      const [user] = await pool.query('SELECT UserID FROM User WHERE Username = ?', [name]);
      const UserID = user[0].UserID;
      const [books, fields] = await pool.query(`
          SELECT b.*, br.Status
          FROM Books b
          JOIN BookRequests br ON b.BookID = br.BookID
          WHERE b.BookID IN (?)
          AND br.UserID = ?
      `, [BookIDs, UserID]);
      console.log(books)
      res.render('viewRequests', { books: books });
    }
  } catch (error) {
    console.error(error);
  }
})

router.get("/home/return", async (req, res) => {
  async function getRequests() {
    token = req.cookies.uid;
    const decoded = jwt.verify(token, secret);
    const name = decoded.username;
    const [user] = await pool.query('SELECT UserID FROM User WHERE Username = ?', [name]);
    const UserID = user[0].UserID;

    try {
      const [rows, fields] = await pool.query("SELECT BookRequests.BookID, BookRequests.UserID,BookRequests.RequestID, BookRequests.RequestDate, User.Username, Books.Title FROM BookRequests JOIN User ON BookRequests.UserID = User.UserID JOIN Books ON BookRequests.BookID = Books.BookID WHERE BookRequests.Status = 'Accepted' AND BookRequests.UserID = ? ", [UserID]);
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const requests = await getRequests();
    console.log(requests)
    res.render('returnBooks.ejs', { requests: requests });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }

})

router.post("/home/return", async (req, res) => {
  const selectedRequests = req.body.selectedRequests;
  if (Array.isArray(selectedRequests)) {
    try{
    for (const requestID of selectedRequests) {
      await pool.query('UPDATE BookRequests SET Status = "Returned" WHERE RequestID = ?', [requestID]);
    }
    res.redirect('/home/requests');
  }catch (error) {
    console.error(error);
    res.status(500).send('Error returning books');
  }
  } 
  else{
    try{
      await pool.query('UPDATE BookRequests SET Status = "Returned" WHERE RequestID = ?', [selectedRequests]);
    }catch(error) {
      console.error(error);
      res.status(500).send('Error returning books');
    }
  }
})

router.post("/home/requestAdmin", async (req, res) => {
  token = req.cookies.uid;
  const decoded = jwt.verify(token, secret);
  const name = decoded.username;
  const role = decoded.role;
  const [user] = await pool.query('SELECT UserID FROM User WHERE Username = ?', [name]);
  const UserID = user[0].UserID;
  try {
    await pool.query("UPDATE User SET AdminRequest = 'Pending' WHERE UserID =?",[UserID])
    res.send("Request Sent!");
  } catch (error) {
    console.log(error);
    throw error;
  }
})

router.get("/home/borrowHistory",async(req,res)=>{
  async function getHistory(){
    token = req.cookies.uid;
    const decoded = jwt.verify(token, secret);
    const name = decoded.username;
    const [user] = await pool.query('SELECT UserID FROM User WHERE Username = ?', [name]);
    const UserID = user[0].UserID;
      try {
        const [rows, fields] =  await pool.query("SELECT br.AcceptDate, br.RequestID, br.BookID, b.Title FROM BookRequests br INNER JOIN Books b ON br.BookID = b.BookID WHERE br.UserID = ? AND (br.Status = 'Accepted' OR br.Status = 'Returned')", [UserID])
      return rows;
    } catch (error) {
      throw error;
    }
  } 
  try {
    const history = await getHistory();
    console.log(history)
    res.render('borrowHistory.ejs', { history: history });
  }catch(err){
    console.log(err)
    res.status(500).send("Error in viewing borrowing history");
  }
})

router.get("/logout",async(req,res)=>{
  const cookies = req.cookies;
  for( cookie in cookies){
    res.clearCookie(cookie);
  }
  res.redirect("/login");
})

module.exports = router;