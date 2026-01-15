export type ProfileImageType = {
  image_id: number;
  image_name: string;
};

export type UserExistsType = {
  exists: boolean;
};

export type SignUpPayload = {
  image_id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  password: string;
};


