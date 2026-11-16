import coordAdminImg from '../assets/images/avatar_coord_admin_1794838033433.jpg';
import techFemale1Img from '../assets/images/avatar_tech_female_1_1794838035104.jpg';
import techMale1Img from '../assets/images/avatar_tech_male_1_1794838037018.jpg';
import techMale2Img from '../assets/images/avatar_tech_male_2_1794838035411.jpg';

export type AvatarKey = 'coord_admin' | 'tech_male_1' | 'tech_male_2' | 'tech_female_1';

export const AVATAR_MAP: Record<AvatarKey, string> = {
  coord_admin: coordAdminImg,
  tech_male_1: techMale1Img,
  tech_male_2: techMale2Img,
  tech_female_1: techFemale1Img,
};

export function getAvatarSrc(key: AvatarKey): string {
  return AVATAR_MAP[key] ?? techMale1Img;
}
