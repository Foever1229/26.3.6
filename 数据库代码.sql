-- 计算机科学技术学院管理平台
-- 适用版本：MySQL 8.0+
DROP DATABASE IF EXISTS college_management;
CREATE DATABASE college_management DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE college_management;

-- 用户表
DROP TABLE IF EXISTS User;
CREATE TABLE User (
    UserID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(100) NOT NULL,
    Password VARCHAR(255) NOT NULL,
    RoleID INT NOT NULL,
    RealName VARCHAR(50) NULL,
    Department VARCHAR(100) NULL,
    Phone VARCHAR(20) NULL,
    Email VARCHAR(100) NULL,
    CreateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdateTime DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 教学任务表
DROP TABLE IF EXISTS TeachingTask;
CREATE TABLE TeachingTask (
    TaskID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    CourseName VARCHAR(100) NOT NULL,
    CourseCode VARCHAR(50) NULL,
    TeacherID INT NOT NULL,
    TeacherName VARCHAR(50) NOT NULL,
    Hours INT NOT NULL DEFAULT 0,
    Credits DECIMAL(3,1) NULL,
    Semester VARCHAR(20) NOT NULL,
    AcademicYear VARCHAR(20) NULL,
    UserID INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教学任务管理';

-- 学生信息表
DROP TABLE IF EXISTS StudentInfo;
CREATE TABLE StudentInfo (
    StudentID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    StuNo VARCHAR(50) NOT NULL UNIQUE,
    Name VARCHAR(50) NOT NULL,
    Gender VARCHAR(10) NULL,
    Major VARCHAR(100) NOT NULL,
    Grade VARCHAR(20) NOT NULL,
    Class VARCHAR(50) NULL,
    Credits DECIMAL(5,2) DEFAULT 0.00,
    Rank INT NULL,
    Phone VARCHAR(20) NULL,
    Email VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生信息管理';

-- 科研论文表
DROP TABLE IF EXISTS ResearchPaper;
CREATE TABLE ResearchPaper (
    PaperID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(200) NOT NULL,
    Author VARCHAR(100) NOT NULL,
    FirstAuthorID INT NULL,
    CorrespondingAuthorID INT NULL,
    Journal VARCHAR(100) NOT NULL,
    IndexType VARCHAR(20) NULL,
    Zone VARCHAR(10) NULL,
    PublishDate DATE NOT NULL,
    DOI VARCHAR(100) NULL,
    FundProject VARCHAR(200) NULL,
    UserID INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='科研论文管理';

-- 竞赛获奖表
DROP TABLE IF EXISTS CompetitionAward;
CREATE TABLE CompetitionAward (
    AwardID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    CompetitionName VARCHAR(100) NOT NULL,
    Level VARCHAR(20) NOT NULL,
    AwardGrade VARCHAR(20) NOT NULL,
    WinnerNames TEXT NOT NULL,
    Advisor1 VARCHAR(50) NULL,
    AdvisorDept1 VARCHAR(100) NULL,
    AwardDate DATE NULL,
    AwardDoc VARCHAR(255) NULL,
    UserID INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='竞赛获奖管理';

-- 大创项目表
DROP TABLE IF EXISTS InnovationProject;
CREATE TABLE InnovationProject (
    ProjectID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ProjectName VARCHAR(200) NOT NULL,
    Level VARCHAR(20) NOT NULL,
    LeaderName VARCHAR(50) NOT NULL,
    MemberNames TEXT NULL,
    Advisor VARCHAR(50) NULL,
    StartTime DATE NULL,
    EndTime DATE NULL,
    Funding DECIMAL(10,2) DEFAULT 0.00,
    UserID INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大创项目管理';

-- 教师信息扩展表
DROP TABLE IF EXISTS TeacherInfo;
CREATE TABLE TeacherInfo (
    TeacherID INT NOT NULL PRIMARY KEY,
    IdNumber VARCHAR(20) NULL,
    FirstHireDate DATE NULL,
    ConfirmDate DATE NULL,
    RecruitLevel VARCHAR(50) NULL,
    SpecialLevel VARCHAR(50) NULL,
    SpecialContractDate DATE NULL,
    SocialPartTime TEXT NULL,
    ResearchField TEXT NULL,
    Honors TEXT NULL,
    AbroadStart DATE NULL,
    AbroadEnd DATE NULL,
    AbroadCountry VARCHAR(50) NULL,
    ChildrenInfo TEXT NULL,
    PartTimeCompany TEXT NULL,
    UpdateTime DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教师人事扩展信息';

-- 建立索引
ALTER TABLE User ADD INDEX idx_roleid (RoleID);
ALTER TABLE TeachingTask ADD INDEX idx_teacherid (TeacherID);
ALTER TABLE TeachingTask ADD INDEX idx_semester (Semester);
ALTER TABLE StudentInfo ADD INDEX idx_grade (Grade);
ALTER TABLE StudentInfo ADD INDEX idx_major (Major);
ALTER TABLE ResearchPaper ADD INDEX idx_publishdate (PublishDate);
ALTER TABLE ResearchPaper ADD INDEX idx_indextype (IndexType);

-- 初始化测试数据
INSERT INTO User (Username, Password, RoleID, RealName, Department) VALUES 
('admin','123456',1,'系统管理员','计算机学院'),
('teacher01','123456',2,'张老师','计算机系'),
('student01','123456',3,'李同学','计算机科学与技术');

SELECT '数据库初始化完成' AS result;