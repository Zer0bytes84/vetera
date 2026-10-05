import React from "react";

import { useStockPageModel } from "../hooks/use-stock-page-model";
import { StockView } from "../components/stock-view";

const Stock: React.FC = () => <StockView {...useStockPageModel()} />;
export default Stock;
