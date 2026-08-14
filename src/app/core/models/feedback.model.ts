export interface Feedback {
  id: string;
  grievanceId: string;
  citizenId: string;
  citizenName: string;
  rating: number; // 1 to 5
  comments: string;
  resolutionSatisfactory: boolean;
  createdAt: string;
}
