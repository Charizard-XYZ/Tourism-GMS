export interface Feedback {
  id: string;
  grievanceId: string;
  touristId?: string;
  touristName?: string;
  rating: number; // 1 to 5
  comments: string;
  resolutionSatisfactory: boolean;
  createdAt: string;
}
