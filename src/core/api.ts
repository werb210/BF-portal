import axios from "axios";
import { getSiloFromHost } from "./silo";

const silo = getSiloFromHost();

export const api = axios.create({
  baseURL: `/api/${silo.toLowerCase()}`
});
