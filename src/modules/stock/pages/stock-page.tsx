import type React from "react";
import { StockView } from "../components/stock-view";
import { useStockPageModel } from "../hooks/use-stock-page-model";

const Stock: React.FC = () => <StockView {...useStockPageModel()} />;
export default Stock;
