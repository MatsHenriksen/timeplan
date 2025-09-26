CREATE DATABASE IF NOT EXISTS timeplan_db;
USE timeplan_db;

-- Create users table
CREATE TABLE IF NOT EXISTS brukere (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brukernavn VARCHAR(50) UNIQUE NOT NULL,
    passord_hash VARCHAR(255) NOT NULL,
    klasse VARCHAR(10),
    rolle ENUM('lærer', 'elev') NOT NULL,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_innlogget TIMESTAMP NULL,
    aktiv BOOLEAN DEFAULT TRUE,
    INDEX idx_brukernavn (brukernavn),
    INDEX idx_rolle (rolle),
    INDEX idx_klasse (klasse)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create schedule table
CREATE TABLE IF NOT EXISTS timeplan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lærer_id INT NOT NULL,
    klasse VARCHAR(10) NOT NULL,
    tidspunkt_start TIME NOT NULL,
    tidspunkt_slutt TIME NOT NULL,
    mandag BOOLEAN DEFAULT FALSE,
    tirsdag BOOLEAN DEFAULT FALSE,
    onsdag BOOLEAN DEFAULT FALSE,
    torsdag BOOLEAN DEFAULT FALSE,
    fredag BOOLEAN DEFAULT FALSE,
    fag VARCHAR(50) NOT NULL,
    rom VARCHAR(20) NOT NULL,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    oppdatert TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    aktiv BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (lærer_id) REFERENCES brukere(id) ON DELETE CASCADE,
    INDEX idx_klasse (klasse),
    INDEX idx_lærer (lærer_id),
    INDEX idx_tid (tidspunkt_start, tidspunkt_slutt),
    INDEX idx_rom (rom),
    INDEX idx_fag (fag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS endringslogg (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bruker_id INT NOT NULL,
    handling VARCHAR(50) NOT NULL,
    tabell VARCHAR(50) NOT NULL,
    post_id INT,
    gamle_verdier JSON,
    nye_verdier JSON,
    tidspunkt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_adresse VARCHAR(45),
    FOREIGN KEY (bruker_id) REFERENCES brukere(id),
    INDEX idx_bruker (bruker_id),
    INDEX idx_tidspunkt (tidspunkt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS økter (
    id VARCHAR(128) PRIMARY KEY,
    bruker_id INT NOT NULL,
    ip_adresse VARCHAR(45),
    user_agent VARCHAR(255),
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sist_aktiv TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    utløper TIMESTAMP NOT NULL,
    FOREIGN KEY (bruker_id) REFERENCES brukere(id) ON DELETE CASCADE,
    INDEX idx_bruker (bruker_id),
    INDEX idx_utløper (utløper)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create notifications table
CREATE TABLE IF NOT EXISTS varsler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bruker_id INT NOT NULL,
    tittel VARCHAR(100) NOT NULL,
    melding TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    lest BOOLEAN DEFAULT FALSE,
    opprettet TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bruker_id) REFERENCES brukere(id) ON DELETE CASCADE,
    INDEX idx_bruker_ulest (bruker_id, lest),
    INDEX idx_opprettet (opprettet)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;