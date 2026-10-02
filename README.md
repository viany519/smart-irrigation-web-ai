# Green Pulse

Green Pulse is an AI-powered smart watering decision support system
designed to help users monitor indoor plants and determine when
watering is required based on environmental sensor data.

## Features

- User authentication
- Plant management
- Plant monitoring dashboard
- Soil moisture monitoring
- Temperature and humidity input
- AI watering prediction
- Healthy / Needs Watering status
- Watering history
- Notifications
- Simulation mode
- User profile management

## Machine Learning

The system uses environmental data including:

- Soil Moisture
- Soil Temperature
- Air Humidity

Several machine learning algorithms were evaluated:

- Logistic Regression
- Decision Tree
- Random Forest
- Support Vector Machine (SVM)

Logistic Regression was selected as the primary model.

## System Architecture

Web Interface
      ↓
FastAPI Backend
      ↓
Machine Learning Model
      ↓
Watering Prediction
      ↓
Healthy / Needs Watering

## Tech Stack

### AI & Backend
- Python
- FastAPI
- Scikit-learn
- Logistic Regression
- Joblib

### Frontend
- HTML
- CSS
- JavaScript

### Deployment
- Vercel

## Live Demo

[Open Green Pulse](https://smart-irrigation-web-ai.vercel.app)

## Project Scope

Green Pulse is currently developed as a proof-of-concept.
Sensor values are simulated/manually entered through the web interface.
Future development may include integration with physical IoT sensors
and automated irrigation hardware.

## Team

- Maria Yohana Vianny Leo
- Jesselyn Angelia Luwu
- Faisal Ramdhani

## License

This project was developed for academic and educational purposes.
