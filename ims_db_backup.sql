-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: ims_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `ims_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `ims_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `ims_db`;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin` (
  `admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin`
--

LOCK TABLES `admin` WRITE;
/*!40000 ALTER TABLE `admin` DISABLE KEYS */;
INSERT INTO `admin` VALUES (1,'admin','admin123','System Administrator','2025-12-01 20:14:33');
/*!40000 ALTER TABLE `admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `category_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_id` (`category_id`),
  UNIQUE KEY `category_id_2` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (11,1,'Snacks','Quick, ready-to-eat treats such as chips, nuts, chocolates, and biscuits commonly bought for on-the-go snacking.'),(12,2,'Beverages','Popular drinks including water, sodas, juices, energy drinks, and flavored drinks kept chilled and ready to consume.'),(13,3,'Bread & Pastries','Fresh or packaged bakery items ideal for quick meals or snacks.'),(14,4,'Canned Goods','Long-shelf-life food items such as canned meats, fish, and ready-to-eat viands.'),(15,5,'Dairy & Frozen','Chilled or frozen products including milk, cheese, ice cream, and ready-to-cook frozen meat.'),(34,6,'Personal Care','Basic hygiene needs');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `employees` (
  `employee_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(10) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `date_created` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,'E606272','Wayne Ramirez','jotramirez06@gmail.com','12312','wa213','$2y$10$.UW5jGxXWGIWc/jO8TIlZug9AQbXFmXCPNzG6gKrVzGcI8/yaot6q','2025-12-01','2025-12-01 17:03:26'),(2,'E023014','John W','wayneramirez46@gmail.com','099999999','WYYYYY','$2y$10$G4Elye75FngStTea3NjpguriKQs7xe.XDpeiY2G6hbMtxI1QYamuq','2025-12-01','2025-12-01 17:43:43'),(3,'E150800','Jay Wayne','test0032321@gmail.com','012323333','Wayne123','$2y$10$GiJ2WY0YuwmWQJRf2LY0ueWKaAfX8Sgva205TQUUvO3qbgmaz15JW','2025-12-01','2025-12-01 18:02:30'),(4,'E588828','John Wayne','jotwayne0123@gmail.com','09487000000','John123','$2y$10$6deA0M3UYV4ufMO6EU6zGee7dOZz.x.SqPx9K.q/83/Pv/Yqlqm6a','2025-12-03','2025-12-03 20:26:36'),(5,'E157678','Ericson Dilla','ericson123@gmail.com','09090909091','ericson','$2y$10$vjKlv0JC4v6mXJKVf3v9H.xddst2Rea.1.3iyGQC/CY9L/IArfJSy','2025-12-11','2025-12-11 06:22:50'),(6,'E541502','Sean Tulali Lestat','sean123@gmail.com','09321312353','sean123','$2y$10$vkV.yd2FDU//Yd6tdiIUKOIZAxaPee.hzB12sO01R8EmHO1bQjaga','2026-04-08','2026-04-08 19:45:54');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_code` varchar(20) DEFAULT NULL,
  `product_name` varchar(150) NOT NULL,
  `category_internal_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `stock` int(11) DEFAULT 0,
  `date_added` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_code` (`product_code`),
  KEY `category_internal_id` (`category_internal_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_internal_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'P001','Potato Chips',11,25.00,24,'2025-12-04 04:17:42'),(2,'P002','Chocolate Bar',11,20.00,33,'2025-12-04 04:18:19'),(3,'P003','Roasted Peanuts',11,12.00,48,'2025-12-04 04:21:59'),(4,'P004','Bottled Water',12,15.00,79,'2025-12-04 04:22:25'),(5,'P005','Cola Soft Drink',12,25.00,33,'2025-12-04 04:23:05'),(6,'P006','Pandesal Pack',13,25.00,11,'2025-12-04 04:23:23'),(7,'P007','Ice Cream Cup',15,25.00,15,'2025-12-04 04:23:49'),(8,'P008','Corned Beef',14,35.00,43,'2025-12-04 04:24:10'),(9,'P009','Tuna Flakes',14,45.00,0,'2025-12-04 04:24:45'),(10,'P010','Frozen Hotdog',15,25.00,36,'2025-12-11 14:14:49'),(11,'P011','Sampoo',34,12.00,31,'2025-12-11 14:21:20');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_items`
--

DROP TABLE IF EXISTS `transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transaction_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `product_id` varchar(80) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_items`
--

LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
INSERT INTO `transaction_items` VALUES (2,2,'P006','Pandesal Pack',1,25.00,25.00),(3,2,'P008','Corned Beef',1,35.00,35.00),(4,2,'P007','Ice Cream Cup',1,25.00,25.00),(5,3,'P002','Chocolate Bar',1,20.00,20.00),(6,3,'P001','Potato Chips',1,25.00,25.00),(7,3,'P005','Cola Soft Drink',1,25.00,25.00),(8,4,'P003','Roasted Peanuts',1,12.00,12.00),(9,4,'P006','Pandesal Pack',1,25.00,25.00),(10,5,'P005','Cola Soft Drink',1,25.00,25.00),(11,5,'P004','Bottled Water',1,15.00,15.00),(12,5,'P008','Corned Beef',1,35.00,35.00),(13,6,'P011','Sampoo',2,12.00,24.00),(14,6,'P010','Frozen Hotdog',2,25.00,50.00),(15,6,'P006','Pandesal Pack',1,25.00,25.00),(16,7,'P011','Sampoo',1,12.00,12.00),(17,8,'P006','Pandesal Pack',1,25.00,25.00),(18,8,'P007','Ice Cream Cup',1,25.00,25.00),(19,9,'P010','Frozen Hotdog',2,25.00,50.00),(20,10,'P002','Chocolate Bar',1,20.00,20.00),(21,10,'P011','Sampoo',1,12.00,12.00),(22,11,'P007','Ice Cream Cup',1,25.00,25.00),(23,11,'P003','Roasted Peanuts',1,12.00,12.00);
/*!40000 ALTER TABLE `transaction_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `txn_id` varchar(80) NOT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `date_time` datetime NOT NULL DEFAULT current_timestamp(),
  `subtotal` decimal(12,2) NOT NULL,
  `tax` decimal(12,2) NOT NULL,
  `total` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `txn_id` (`txn_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (2,'TXN-20251204-WLS5U',3,'2025-12-04 04:25:24',85.00,10.20,95.20),(3,'TXN-20251204-WF08L',3,'2025-12-04 04:25:28',70.00,8.40,78.40),(4,'TXN-20251204-CW7GK',3,'2025-12-04 04:25:32',37.00,4.44,41.44),(5,'TXN-20251204-BBVSX',4,'2025-12-04 04:28:25',75.00,9.00,84.00),(6,'TXN-20251211-N5TSU',5,'2025-12-11 14:26:52',99.00,11.88,110.88),(7,'TXN-20260409-N6YS9',4,'2026-04-09 03:44:44',12.00,1.44,13.44),(8,'TXN-20260409-C9CWD',6,'2026-04-09 03:46:24',50.00,6.00,56.00),(9,'TXN-20260409-FMKRQ',6,'2026-04-09 04:24:42',50.00,6.00,56.00),(10,'TXN-20260409-ROQM5',4,'2026-04-09 16:20:27',32.00,3.84,35.84),(11,'TXN-20260409-ZX33E',4,'2026-04-09 16:23:30',37.00,4.44,41.44);
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-09 19:18:35
