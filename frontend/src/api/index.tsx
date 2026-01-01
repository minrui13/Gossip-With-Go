//managing url environment
import axios from 'axios';
const API_URL = process.env.REACT_APP_BUILD_ENV

export const mainAxios = axios.create({
    baseURL: API_URL + "/api"
})