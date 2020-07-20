export interface User {
    emailAddress: string;
    firstName: string;
    lastName: string;
    saltyPassword: string;
    emailVerified: boolean;
    lastLogin?: number;
    createDate: number;
    claims?: any;
}
