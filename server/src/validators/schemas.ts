import { z } from 'zod';

export const registerTouristSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters long').max(100),
  email: z.string().trim().email('Invalid email address format'),
  phoneNumber: z.string().trim().min(7, 'Invalid phone number').max(20)
});


export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters long').max(100).optional(),
  email: z.string().trim().email('Invalid email address format').optional(),
  phoneNumber: z.string().trim().min(7, 'Invalid phone number').max(20).optional()
});

export const createOfficerSchema = z.object({
  name: z.string().trim().min(2, 'Officer name is required').max(100),
  email: z.string().trim().email('Invalid officer email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  departmentId: z.string().optional().default(''),
  departmentName: z.string().optional().default('Unassigned'),
  designation: z.string().optional().default('Officer'),
  phone: z.string().optional()
});

export const updateOfficerSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().trim().min(6).optional(),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
  isRevoked: z.boolean().optional()
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required'),
  code: z.string().trim().min(2, 'Department code / ID is required'),
  description: z.string().trim().min(5, 'Description is required'),
  contactPhone: z.string().trim().min(5, 'Contact phone is required'),
  contactEmail: z.string().trim().email('Contact email is required'),
  isActive: z.boolean().optional().default(true)
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  code: z.string().trim().min(2).optional(),
  description: z.string().trim().min(5).optional(),
  contactPhone: z.string().trim().min(5).optional(),
  contactEmail: z.string().trim().email().optional(),
  isActive: z.boolean().optional()
});

export const createGrievanceSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  category: z.string().trim().min(1, 'Department category is required'),
  departmentId: z.string().trim().min(1, 'An active department selection is required'),
  departmentName: z.string().optional(),
  location: z.string().trim().min(2, 'Location is required'),
  touristId: z.string().optional(),
  touristName: z.string().optional(),
  touristEmail: z.string().email().optional(),
  touristPhone: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
    size: z.string().optional()
  })).optional().default([])
});

export const assignGrievanceSchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
  departmentName: z.string().min(1, 'Department name is required'),
  officerId: z.string().min(1, 'Officer ID is required'),
  officerName: z.string().min(1, 'Officer name is required')
});

export const updateGrievanceStatusSchema = z.object({
  status: z.enum(['submitted', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'cancelled']),
  resolutionDetails: z.string().optional(),
  resolutionAttachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
    size: z.string().optional()
  })).optional()
});

export const createCommentSchema = z.object({
  grievanceId: z.string().min(1, 'Grievance ID is required'),
  commentText: z.string().trim().min(1, 'Comment text cannot be empty'),
  isInternalOnly: z.boolean().optional().default(false)
});

export const submitFeedbackSchema = z.object({
  grievanceId: z.string().min(1, 'Grievance ID is required'),
  rating: z.number().min(1).max(5),
  comments: z.string().trim().optional().default(''),
  autoClose: z.boolean().optional().default(true)
});
