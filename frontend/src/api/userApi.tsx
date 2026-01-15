import axios from "axios";
import { mainAxios } from ".";
import SignUp from "../pages/SignUp";
import { SignUpPayload, UserExistsType } from "../types/SignUpType";
import { GetUserByIdPayload, GetUserByIdResult } from "../types/AuthType";

//retrieve all users
export const getAllUsers = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.get(`/users/`);
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

//Get user by id
export const getUserById = (payload: GetUserByIdPayload): Promise<GetUserByIdResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(`/users/${payload.user_id}`, "", {
        headers: {
          Authorization: `Bearer ${payload.token}`,
        },
      });
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const addNewUser = (payload: SignUpPayload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(`/users/signup`, payload);
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const checkUserExists = (payload: object): Promise<UserExistsType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(`/users/checkUserExists`, payload);
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
