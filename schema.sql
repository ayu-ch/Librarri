CREATE DATABASE Library;
USE Library;

CREATE TABLE User (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(255) NOT NULL,
    Pass VARCHAR(255) NOT NULL,
    Role VARCHAR(255) NOT NULL,
    Created TIMESTAMP NOT NULL DEFAULT NOW(),
    AdminRequest ENUM('NoRequest', 'Pending', 'Approved') DEFAULT 'NoRequest'
);

CREATE TABLE Books (
    BookID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Author VARCHAR(255),
    Genre VARCHAR(255),
    Quantity INT 
);

CREATE TABLE BookRequests (
    RequestID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    BookID INT,
    RequestDate TIMESTAMP NOT NULL DEFAULT NOW(),
    AcceptDate TIMESTAMP DEFAULT NULL,
    Status ENUM('Pending','Accepted','Returned') DEFAULT 'Pending',
    FOREIGN KEY (UserID) REFERENCES User(UserID),
    FOREIGN KEY (BookID) REFERENCES Books(BookID)
);


