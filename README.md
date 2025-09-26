Timeplan

Oppskrift for innstallering:

# Logg inn i MySQL
mysql -u root -p

# Kjør følgende SQL-kommandoer:
CREATE DATABASE timeplan_db;
USE timeplan_db;
EXIT;

# Opprett tabeller 
mysql -u root -p timeplan_db < scripts/init.sql

# lag .env med dette innholdet
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=ditt_mysql_passord_her
DB_NAME=timeplan_db
PORT=3000
JWT_SECRET=en-lang-tilfeldig-streng-her

# kjør
npm run seed

# kjør
npm start

# test
Åpne nettleseren og gå til: http://localhost:3000

Test-innlogginger:

Lærer: brukernavn: kari.nordmann / passord: lærer123
Elev: brukernavn: elev1a.1 / passord: elev123