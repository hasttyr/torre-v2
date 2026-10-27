import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'torre:isPublic';

/** A route anyone may call: every other route needs a valid access token (US-022:AC8). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
