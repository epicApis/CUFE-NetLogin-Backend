DELIMITER $$ CREATE PROCEDURE UpdateStatisticsAndDevices(
    IN in_username CHAR(64),
    IN in_usage FLOAT,
    IN in_date DATE,
    IN in_deviceid CHAR(64),
    IN in_deviceos CHAR(32),
    OUT out_success INT,
    OUT out_device_count INT
) BEGIN -- 声明变量用于存储查询结果
DECLARE user_exists INT;
DECLARE device_exists INT;
DECLARE times INT;
DECLARE lastusage FLOAT;
-- 检查username是否存在于statistics���中
SELECT COUNT(*) INTO user_exists
FROM statistics
WHERE username = in_username;
-- 如果statistics表中不存在该username，则插入新行
IF user_exists = 0 THEN
INSERT INTO statistics (username, lastusage, times, lasttime)
VALUES (in_username, in_usage, 1, in_date);
ELSE -- 如果存在，则times列+1
-- 获取当前times和lastusage的值
SELECT times,
    lastusage INTO times,
    lastusage
FROM statistics
WHERE username = in_username;
IF times >= 100000000
OR lastusage >= 100000000 THEN
SET out_success = 0;
SET out_device_count = 0;
ELSE
UPDATE statistics
SET times = times + 1,
    lasttime = in_date,
    lastusage = in_usage
WHERE username = in_username;
END IF;
END IF;
-- 检查devices表中是否存在对应的记录
SELECT COUNT(*) INTO device_exists
FROM devices
WHERE username = in_username
    AND deviceid = in_deviceid;
-- 如果devices表中存在记录，则更新status列
IF device_exists = 1 THEN
UPDATE devices
SET deviceos = in_deviceos
WHERE username = in_username
    AND deviceid = in_deviceid;
ELSE -- 如果devices表中不存在记录，则插入新行
INSERT INTO devices (username, deviceid, deviceos)
VALUES (in_username, in_deviceid, in_deviceos);
END IF;
-- 设置输出参数
SET out_success = 1;
SELECT COUNT(*) INTO out_device_count
FROM devices
WHERE username = in_username;
END $$ DELIMITER;