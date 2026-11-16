@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-21"
set "MAVEN_CMD=C:\Users\THANH SON\.m2\wrapper\dists\apache-maven-3.9.16-bin\5grr65jo27hi51sujmtcldfovl\apache-maven-3.9.16\bin\mvn.cmd"
cd /d "%~dp0backend"
echo ==============================================
echo  Starting Shoe Store Backend (Spring Boot 3)
echo  Connecting to TiKV at 127.0.0.1:2379
echo ==============================================
"%MAVEN_CMD%" spring-boot:run
