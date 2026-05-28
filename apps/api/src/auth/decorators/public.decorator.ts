import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca un endpoint como público — el JwtAuthGuard global lo saltea */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
