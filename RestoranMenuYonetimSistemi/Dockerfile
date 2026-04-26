FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["RestoranMenuYonetimSistemi.csproj", "."]
RUN dotnet restore "RestoranMenuYonetimSistemi.csproj"

COPY . .
RUN dotnet publish "RestoranMenuYonetimSistemi.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "RestoranMenuYonetimSistemi.dll"]
