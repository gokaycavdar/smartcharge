#!/bin/bash

# SmartCharge Coupon System - Deployment & Testing Guide

## 1. Database Migration

# Run migration (automatically on Docker startup)
# Migration 000006_coupon_system will:
# - Create coupon_catalog table
# - Create user_coupons table
# - Seed 5 example coupons

## 2. Generate SQLC

# From smartcharge-api directory:
cd smartcharge-api
sqlc generate -f db/sqlc.yaml

# This generates Go code from db/queries/coupons.sql into db/generated/

## 3. Build & Run

docker compose build api
docker compose up -d

## 4. Test Endpoints

# Get available coupons (authenticated)
curl -X GET http://localhost:8080/v1/coupons/list \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Redeem a coupon (authenticated)
curl -X POST http://localhost:8080/v1/coupons/redeem \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"couponId": 1}'

# Get user's active coupons (authenticated)
curl -X GET http://localhost:8080/v1/coupons/active \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

## 5. Frontend Testing

npm run dev

# Navigate to: http://localhost:3000/driver/login
# Login with: driver@test.com / password
# Go to: http://localhost:3000/driver/coupons

## Notes

# - Coupons expire after 90 days
# - Simultaneous redemptions are protected by PostgreSQL SERIALIZABLE isolation
# - All coupon operations are ACID-compliant
# - Seed data contains 5 coupons with different discount types and values
