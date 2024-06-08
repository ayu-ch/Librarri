const express = require("express");
const pool = require("../database");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { hashPassword, setUser, getUser, isAdmin } = require("../service/auth");
const router = express.Router();
const jwt = require("jsonwebtoken");
const secret = "hello";

router.get("/admin/books", isAdmin, (req, res) => {
  return res.render("manageBooks");
});
router.get("/admin/books/add", isAdmin, (req, res) => {
  return res.render("addBook");
});

router.post("/admin/books/add", isAdmin, async (req, res) => {
  async function bookExists(title, author) {
    const [rows, fields] = await pool.query(
      "SELECT * FROM Books WHERE Title = ? AND Author = ? ",
      [title, author]
    );
    return rows.length > 0;
  }
  const { title, author, genre, quantity } = req.body;

  if (await bookExists(title, author)) {
    await pool.query(
      "UPDATE Books SET Quantity = Quantity + ? WHERE Title = ? AND author = ?",
      [parseInt(quantity), title, author]
    );
    return res.redirect("/admin/books/list");
  } else {
    try {
      const sql =
        "INSERT INTO Books (Title, Author, Genre, Quantity) VALUES (?, ?, ?, ?)";
      await pool.query(sql, [title, author, genre, quantity]);
      return res.redirect("/admin/books/list");
    } catch (error) {
      console.error(error);
      return res.status(500).send("Error inserting user into database");
    }
  }
});

router.get("/admin/books/list", isAdmin, async (req, res) => {
  async function getBooks() {
    try {
      const [rows, fields] = await pool.query("SELECT * FROM Books");
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const books = await getBooks();
    res.render("listBook", { books: books });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }
});

router.get("/admin/books/remove", isAdmin, async (req, res) => {
  async function getBooks() {
    try {
      const [rows, fields] = await pool.query("SELECT * FROM Books");
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const books = await getBooks();
    res.render("removeBook", { books: books });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }
});

router.post("/admin/books/remove", async (req, res) => {
  const selectedBooks = req.body.selectedBooks;
  if (Array.isArray(selectedBooks)) {
    try {
      for (const BookID of selectedBooks) {
        const checkRequest = await pool.query(
          "SELECT * FROM BookRequests WHERE BookID = ? AND Status = 'Accepted'",
          [BookID]
        );

        if (checkRequest.length != 0) {
          return res.render("displayError", {
            error: "A book is already accepted",
          });
        } else {
          await pool.query("DELETE FROM Books WHERE BookID = ?", [BookID]);
        }
      }
      res.redirect("/admin/books/remove");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error accepting requests");
    }
  } else {
    try {
      const checkRequest = await pool.query(
        "SELECT * FROM BookRequests WHERE BookID = ? AND Status = 'Accepted'",
        [selectedBooks]
      );
      console.log(checkRequest);
      if (checkRequest.length != 0) {
        return res.render("displayError", {
          error: "A book is already accepted",
        });
      } else {
        await pool.query("DELETE FROM Books WHERE BookID = ?", [selectedBooks]);
      }
      res.redirect("/admin/books/remove");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error accepting requests");
    }
  }
});

router.get("/admin/books/update", isAdmin, async (req, res) => {
  async function getBooks() {
    try {
      const [rows, fields] = await pool.query("SELECT * FROM Books");
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const books = await getBooks();
    res.render("updateBook", { books: books });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }
});

router.post("/admin/requests/accept", isAdmin, async (req, res) => {
  const requestID = req.body.requestID;
  try {
    await pool.query(
      "UPDATE BookRequests SET Status='Accepted' WHERE RequestID=?",
      [requestID]
    );
    await pool.query(
      "UPDATE BookRequests SET AcceptDate = NOW() WHERE RequestID = ?",
      [requestID]
    );
    const [bookIDS] = await pool.query(
      "SELECT BookID FROM BookRequests WHERE RequestID = ?",
      [requestID]
    );
    const BookID = bookIDS[0].BookID;
    await pool.query(
      "UPDATE Books  SET Quantity = Quantity - 1 WHERE BookID=?",
      [BookID]
    );
    res.redirect("/admin/requests");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }
});

router.post("/admin/requests/deny", isAdmin, async (req, res) => {
  const requestID = req.body.requestID;
  console.log(requestID);
  try {
    await pool.query(
      "UPDATE BookRequests SET Status='Denied' WHERE RequestID=?",
      [requestID]
    );

    res.redirect("/admin/requests");
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }
});

router.post("/admin/books/update", isAdmin, async (req, res) => {
  const selectedBooks = req.body.selectedBooks;
  console.log(selectedBooks);

  try {
    for (let i = 0; i < selectedBooks.length; i += 2) {
      await pool.query("UPDATE Books SET Quantity =?  WHERE BookID = ?", [
        selectedBooks[i],
        selectedBooks[i + 1],
      ]);
    }
    res.redirect("/admin/books/list");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error accepting requests");
  }
});

router.get("/admin/requests", isAdmin, async (req, res) => {
  async function getRequests() {
    try {
      const [rows, fields] = await pool.query(
        "SELECT BookRequests.BookID, BookRequests.UserID,BookRequests.RequestID, BookRequests.RequestDate, User.Username, Books.Title FROM BookRequests JOIN User ON BookRequests.UserID = User.UserID JOIN Books ON BookRequests.BookID = Books.BookID WHERE BookRequests.Status = 'Pending'"
      );
      return rows;
    } catch (error) {
      throw error;
    }
  }
  try {
    const requests = await getRequests();
    res.render("acceptRequests.ejs", { requests: requests });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }
});

// router.post("/admin/requests", isAdmin, async (req, res) => {
//   const selectedRequests = req.body.selectedRequests;
//   if (Array.isArray(selectedRequests)) {
//     try {
//       for (const requestID of selectedRequests) {
//         await pool.query(
//           'UPDATE BookRequests SET Status = "Accepted" WHERE RequestID =?',
//           requestID
//         );
//         await pool.query(
//           "UPDATE BookRequests SET AcceptDate = NOW() WHERE RequestID = ?",
//           [requestID]
//         );
//         const [bookIDS] = await pool.query(
//           "SELECT BookID FROM BookRequests WHERE RequestID = ?",
//           [requestID]
//         );
//         const BookID = bookIDS[0].BookID;
//         await pool.query(
//           "UPDATE Books  SET Quantity = Quantity - 1 WHERE BookID=?",
//           [BookID]
//         );
//       }
//       res.redirect("/admin/requests");
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Error accepting requests");
//     }
//   } else {
//     try {
//       await pool.query(
//         'UPDATE BookRequests SET Status = "Accepted" WHERE RequestID =?',
//         [selectedRequests]
//       );
//       await pool.query(
//         "UPDATE BookRequests SET AcceptDate = NOW() WHERE RequestID = ?",
//         [selectedRequests]
//       );
//       const [bookIDS] = await pool.query(
//         "SELECT BookID FROM BookRequests WHERE RequestID = ?",
//         [selectedRequests]
//       );
//       const BookID = bookIDS[0].BookID;
//       await pool.query(
//         "UPDATE Books  SET Quantity = Quantity - 1 WHERE BookID=?",
//         [BookID]
//       );
//       res.redirect("/admin/requests");
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Error accepting requests");
//     }
//   }
// });

router.get("/admin/users", isAdmin, async (req, res) => {
  async function getUsers() {
    try {
      const [users, fields] = await pool.query(
        "SELECT * FROM User WHERE AdminRequest = 'Pending'"
      );
      return users;
    } catch (error) {
      throw error;
    }
  }
  try {
    const users = await getUsers();
    res.render("changePrivileges.ejs", { users: users });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching books from database.");
  }
});

router.post("/admin/users", isAdmin, async (req, res) => {
  const selectedUsers = req.body.selectedUsers;
  if (Array.isArray(selectedUsers)) {
    try {
      for (const UserID of selectedUsers) {
        await pool.query(
          'UPDATE User SET Role = "Admin" WHERE UserID =?',
          parseInt([UserID])
        );
        await pool.query(
          "UPDATE User SET AdminRequest ='Accepted' WHERE UserID = ?",
          parseInt([UserID])
        );
      }

      res.redirect("/admin/users");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error changing priviliges");
    }
  } else {
    try {
      await pool.query(
        'UPDATE User SET Role = "Admin" WHERE UserID =?',
        parseInt([selectedUsers])
      );
      await pool.query(
        "UPDATE User SET AdminRequest ='Accepted' WHERE UserID = ?",
        parseInt([selectedUsers])
      );
      res.redirect("/admin/users");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error changing priviliges");
    }
  }
});

module.exports = router;
