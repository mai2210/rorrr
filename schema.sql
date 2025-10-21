-- ===============================
-- Drop existing tables for clean setup
-- ===============================
DROP TABLE IF EXISTS club_members;
DROP TABLE IF EXISTS club_announcements;
DROP TABLE IF EXISTS general_announcements;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS users;

-- ===============================
-- Create users table (Admins and Leaders only)
-- ===============================
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Admin', 'Leader')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Create clubs table
-- ===============================
CREATE TABLE clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    admin_id INTEGER,
    leader_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Create updated club_members table
-- ===============================
CREATE TABLE club_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,                     -- the club this member joined
    student_id TEXT UNIQUE NOT NULL,             -- unique student ID
    email TEXT UNIQUE NOT NULL,                  -- student email
    password TEXT NOT NULL,                      -- password (store hashed ideally)
    name TEXT NOT NULL,                          -- full name of the student
    role TEXT NOT NULL CHECK(role IN ('Leader', 'Member')) DEFAULT 'Member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id, student_id)                  -- prevent same student joining same club twice
);

-- ===============================
-- Create club_announcements table
-- ===============================
CREATE TABLE club_announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Create general_announcements table
-- ===============================
CREATE TABLE general_announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Create events table
-- ===============================
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    club_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Insert Admins
-- ===============================
INSERT INTO users (email, password, role) VALUES 
('AdminLupak@gmail.com', 'AdminLupak', 'Admin');

-- ===============================
-- Insert Leaders
-- ===============================
INSERT INTO users (email, password, role) VALUES
('Leader1@gmail.com', 'Leader1', 'Leader'),
('Leader2@gmail.com', 'Leader2', 'Leader'),
('Leader3@gmail.com', 'Leader3', 'Leader');

-- ===============================
-- Insert Clubs with Leaders
-- ===============================
INSERT INTO clubs (name, description, image, admin_id, leader_id) VALUES
('Robotics Club', 'Building the future, one robot at a time. The Robotics Club offers hands-on experience in engineering, programming, and design. Join us to create innovative robots and compete in exciting challenges!', 'https://mir-s3-cdn-cf.behance.net/project_modules/hd/bb908f12412471.56268abbb66ed.png', 1, 3),
('Art Guild', 'A community for creative expression and artistic exploration. The Art Guild hosts workshops, exhibitions, and showcases for artists of all skill levels. Express yourself through various mediums!', 'https://i0.wp.com/www.palmerlibrary.org/wp-content/uploads/2024/06/Art-Club.png', 1, 4),
('Photography Club', 'Capturing moments and mastering the art of light and shadow. Join us for photo walks, exhibitions, and workshops to improve your photography skills and share your vision with the world!', 'https://i.pinimg.com/1200x/14/23/73/142373755470d869b67c30eb1e9dbdc5.jpg', 1, 5);

-- ===============================
-- Insert Club Members (Leaders and Members)
-- ===============================
INSERT INTO club_members (club_id, student_id, email, password, name, role) VALUES
-- Leaders
(1, '20251013001', 'leader1@gmail.com', 'Leader1', 'Alice Leader1', 'Leader'),
(2, '20251013002', 'leader2@gmail.com', 'Leader2', 'Bob Leader2', 'Leader'),
(3, '20251013003', 'leader3@gmail.com', 'Leader3', 'Charlie Leader3', 'Leader'),

-- Example Member
(1, '20251013004', 'member@gmail.com', 'Member1', 'John Doe', 'Member');

-- ===============================
-- Insert Club Announcements
-- ===============================
INSERT INTO club_announcements (club_id, text) VALUES
(1, 'New meeting this Friday at 4 PM in Lab C. We will be discussing our upcoming competition strategy!'),
(1, 'Reminder: Bring your Arduino kits for the next session.'),
(2, 'Portfolio review session next Tuesday at 3 PM. Bring your best work!'),
(2, 'Art exhibit submissions are now open. Deadline is next month.'),
(3, 'Photo walk this Saturday at 9 AM. Meet at the main entrance. Don''t forget your cameras!'),
(3, 'Workshop on portrait photography next Wednesday at 5 PM.');

-- ===============================
-- Insert General Announcements
-- ===============================
INSERT INTO general_announcements (text) VALUES
('Welcome to ClubHub! Explore and join your favorite organizations.'),
('New semester starting soon! Check out all our amazing clubs and events.'),
('ClubHub now supports mobile access. Download our app today!');

-- ===============================
-- Insert Events
-- ===============================
INSERT INTO events (title, description, event_date, club_id) VALUES
('Robotics Competition', 'Our annual robotics competition. Teams will compete in various challenges. All skill levels welcome!', '2025-11-15', 1),
('Robot Building Workshop', 'Learn the basics of robot construction and programming.', '2025-11-01', 1),
('Art Exhibit', 'Showcasing member artwork from this semester. Public viewing welcome.', '2025-11-20', 2),
('Watercolor Workshop', 'Learn watercolor techniques from a professional artist.', '2025-11-08', 2),
('Photography Walk', 'Explore the city and capture stunning urban photography.', '2025-10-28', 3),
('Portrait Photography Masterclass', 'Advanced techniques for capturing amazing portraits.', '2025-11-12', 3),
('Student Orientation', 'Orientation for all new members. Learn about all our clubs and how to get involved!', '2025-10-26', NULL),
('ClubHub Annual Gala', 'Celebration of all clubs and their achievements this year.', '2025-12-15', NULL);

-- ===============================
-- Indexes for Performance
-- ===============================
CREATE INDEX idx_club_members_club ON club_members(club_id);
CREATE INDEX idx_club_members_student ON club_members(student_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_club ON events(club_id);
