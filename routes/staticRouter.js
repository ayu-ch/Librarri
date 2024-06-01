const express = require("express");
const mysql = require('mysql2')
const pool = mysql.createPool({
  host: 'host',
  user: 'user',
  password: 'pass',
  database: 'db',
}).promise()
const bcrypt = require("bcryptjs")
const { v4: uuidv4 } = require("uuid");
const { hashPassword, setUser, getUser, isAdmin } = require('../service/auth')
const router = express.Router();
const jwt = require('jsonwebtoken');
const secret = "hello"

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
router.get("/admin/books", isAdmin, (req, res) => {
  return res.render("manageBooks");
})
router.get("/admin/books/add", isAdmin, (req, res) => {
  return res.render("addBook");
})

router.post("/admin/books/add", isAdmin, async (req, res) => {
  const { title, author, genre } = req.body;
  try {
    const sql = "INSERT INTO Books (Title, Author, Genre) VALUES (?, ?, ?)";
    await pool.query(sql, [title, author, genre]);
    console.log("Book added to database");
    return res.redirect("/admin/books/list");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Error inserting user into database");
  }
})

router.get("/admin/books/list", isAdmin, async (req, res) => {
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
    res.render('listBook', { books: books });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }


})

router.get("/admin/books/remove", isAdmin, async (req, res) => {
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
    res.render('removeBook', { books: books });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }

})

router.post('/admin/books/delete', async (req, res) => {
  const selectedBooks = req.body.selectedBooks;

  try {
    for (const BookID of selectedBooks) {
      await pool.query('DELETE FROM Books WHERE BookID = ?', [BookID]);
    }

    res.redirect('/admin/books/list');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting books from database');
  }
});

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
      const [rows, fields] = await pool.query('SELECT * FROM BookRequests WHERE UserID = ?',[UserID]);
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
      const [books, fields] = await pool.query(`
                SELECT b.*, br.Status
                FROM Books b
                JOIN BookRequests br ON b.BookID = br.BookID
                WHERE b.BookID IN (${BookIDs.join(',')})
            `);
          console.log(books)
            res.render('viewRequests', { books: books });
    }
  } catch (error) {
    console.error(error);
  }

})

router.get("/admin/requests",isAdmin, async (req, res) => {
  async function getRequests() {
    try {
      const [rows, fields] = await pool.query("SELECT BookRequests.BookID, BookRequests.UserID,BookRequests.RequestID, BookRequests.RequestDate, User.Username, Books.Title FROM BookRequests JOIN User ON BookRequests.UserID = User.UserID JOIN Books ON BookRequests.BookID = Books.BookID WHERE BookRequests.Status = 'Pending'");
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const requests = await getRequests();
    res.render('acceptRequests.ejs', { requests: requests });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }

})

router.post("/admin/requests",isAdmin,async(req,res)=>{
  const selectedRequests = req.body.selectedRequests;
  try {
    for (const requestID of selectedRequests) {
      
      await pool.query('UPDATE BookRequests SET Status = "Accepted" WHERE RequestID =?',[requestID]);
    }

    res.redirect('/admin/requests');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting books from database');
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
      const [rows, fields] = await pool.query("SELECT BookRequests.BookID, BookRequests.UserID,BookRequests.RequestID, BookRequests.RequestDate, User.Username, Books.Title FROM BookRequests JOIN User ON BookRequests.UserID = User.UserID JOIN Books ON BookRequests.BookID = Books.BookID WHERE BookRequests.Status = 'Accepted' AND BookRequests.UserID = ? ",[UserID]);
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

router.post("/home/return",async(req,res)=>{
  const selectedRequests = req.body.selectedRequests;
  try {
    for (const requestID of selectedRequests) {
      
      await pool.query('DELETE FROM BookRequests WHERE RequestID = ?', [requestID]);
    }
  

    res.redirect('/home/requests');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting books from database');
  }
})


module.exports = router;