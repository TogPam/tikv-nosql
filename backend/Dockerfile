FROM eclipse-temurin:17-jre
WORKDIR /app
COPY target/shoe-store-1.0.0.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]