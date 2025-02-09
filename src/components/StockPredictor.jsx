import React from "react";
import {line} from "react-chartjs-2";
import{
    chart as ChartJS,
    CatergoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";

import {getStockData} from "../services/stockData";
import {trainAndPredict} from "../services/predictionModel";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

