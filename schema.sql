CREATE DATABASE Library;
USE Library;

CREATE TABLE User (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(255) NOT NULL,
    Pass VARCHAR(255) NOT NULL,
    Role VARCHAR(255) NOT NULL,
    Created TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO User (Username,Pass)
VALUES
("Test","Test123");

CREATE TABLE Books (
    BookID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Author VARCHAR(255),
    Genre VARCHAR(255)
);

INSERT INTO Books (Title,Author,Genre)
VALUES
("Sekiro","FromSoftware","Souls");

CREATE TABLE BookRequests (
    RequestID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    BookID INT,
    RequestDate TIMESTAMP NOT NULL DEFAULT NOW(),
    Status VARCHAR(255) DEFAULT 'Pending',
    FOREIGN KEY (UserID) REFERENCES User(UserID),
    FOREIGN KEY (BookID) REFERENCES Books(BookID)
);
ALTER TABLE BookRequests
DROP FOREIGN KEY BookRequests_ibfk_2;

ALTER TABLE BookRequests
ADD CONSTRAINT BookRequests_ibfk_2
FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE;

CREATE TABLE AdminRequest (
    RequestID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    Username VARCHAR(255) NOT NULL,
    Role VARCHAR(255)
    FOREIGN KEY (UserID) REFERENCES User(UserID),
    FOREIGN KEY (Username) REFERENCES User(Username)
);

CREATE TABLE BorrowHistory(
    RequestID INT,
    UserID INT,
    AcceptDate TIMESTAMP NOT NULL DEFAULT NOW(),
    BookID INT,
    FOREIGN KEY (UserID) REFERENCES User(UserID),
    FOREIGN KEY (BookID) REFERENCES Books(BookID)
);

ALTER TABLE BookRequests
DROP FOREIGN KEY  BookRequests_ibfk_2,
ADD CONSTRAINT  BookRequests_ibfk_2
FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE;

ALTER TABLE BorrowHistory
DROP FOREIGN KEY fk_book_id,
ADD CONSTRAINT fk_book_id
FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE;

ALTER TABLE BorrowHistory
DROP FOREIGN KEY BorrowHistory_ibfk_2;

-- Add the new foreign key constraint
ALTER TABLE BorrowHistory
ADD CONSTRAINT BorrowHistory_ibfk_2
FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE;
