<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; 
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;  
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Issue a Sanctum token and remember where it was issued from so the
     * Settings > Devices list can describe each session.
     */
    private function issueToken(User $user, Request $request, string $name = 'auth_token'): string
    {
        $result = $user->createToken($name);
        $result->accessToken->forceFill([
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
        ])->save();

        return $result->plainTextToken;
    }

    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            // Self-registration is for patients only. Staff accounts (responder,
            // logistics, admin, ...) are provisioned by an administrator.
            'role' => 'sometimes|in:patient',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'patient',
            'phone' => $request->phone,
        ]);

        $token = $this->issueToken($user, $request);

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        $token = $this->issueToken($user, $request);

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        // Mark the user offline server-side: the client clears its token
        // before it could send /presence/offline itself.
        \Illuminate\Support\Facades\Cache::forget(User::presenceCacheKey($user->id));

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Exchange a short-lived magic-link token for a regular session token.
     * The magic-link token is revoked so the emailed link cannot be reused.
     */
    public function exchangeMagicLink(Request $request)
    {
        $user = $request->user();
        $current = $user->currentAccessToken();

        if (!$current || $current->name !== 'magic-link') {
            return response()->json([
                'message' => 'Only magic-link tokens can be exchanged.',
            ], 422);
        }

        if (!$user->is_active) {
            return response()->json([
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        $current->delete();
        $token = $this->issueToken($user, $request);

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        // Eager-load assigned hospitals so the frontend can display them
        $user = $request->user();
        $user->load('hospitals:id,name,code');

        return response()->json($user);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        $user = Auth::user(); // Get the authenticated user

        $validator = Validator::make($request->all(), [
            // --- Fields from your User model ---
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'nullable|string|max:50', 
            'availability' => 'nullable|string|max:255',
            'language' => 'nullable|string|max:50',
            'theme' => 'nullable|string|max:50',
            'visibility' => 'nullable|string|max:50',

            // --- Fields from your React Form ---
            'patientId' => 'nullable|string',
            'dob' => 'nullable|date',
            'bloodType' => 'nullable|string|max:10',
            'address' => 'nullable|string', 
            'admitted' => 'nullable|date',
            'emergencyContactName' => 'nullable|string',
            'emergencyContactPhone' => 'nullable|string',
            
            // --- Field for mapping ---
            'phoneNumber' => 'nullable|string',
            'phone' => 'nullable|string',       
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        // Get all the validated data
        $validatedData = $validator->validated();

        // --- CRITICAL MAPPING LOGIC ---
        // Map 'phoneNumber' from React state to 'phone' in the database
        if (isset($validatedData['phoneNumber'])) {
            $validatedData['phone'] = $validatedData['phoneNumber'];
            unset($validatedData['phoneNumber']); // Don't try to save 'phoneNumber'
        }
        
        // Update the user with all the validated and mapped data
        $user->update($validatedData);

        // Return a consistent response with a message and the updated user
        return response()->json([
            'message' => 'Profile updated successfully!',
            'user' => $user
        ]);
    }

    /**
     * Upload ID for verification
     *  
     */
    public function verifyId(Request $request)
    {
        $request->validate([
            'id_type' => 'required|string|max:50',
            'id_image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $user = $request->user();

        if ($request->hasFile('id_image')) {
            $path = $request->file('id_image')->store('id_uploads', 'public');
            
            $user->update([
                'id_type' => $request->id_type,
                'id_image_path' => $path,
                'verification_status' => 'pending',
            ]);
        }

        return response()->json([
            'message' => 'ID uploaded successfully. Awaiting verification.',
            'user' => $user,
        ]);
    }

    /**
     * Submit complete verification information
     *  
     */
    public function submitVerification(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'birthday' => 'required|date',
            'contact_number' => 'required|string|max:20',
            'address' => 'required|string|max:500',
            'id_type' => 'required|string|max:50',
            'id_image' => 'required|image|mimes:jpeg,png,jpg|max:2048', // 2MB max
        ]);

        $user = $request->user();

        // Store ID image
        $idImagePath = null;
        if ($request->hasFile('id_image')) {
            $idImagePath = $request->file('id_image')->store('id_uploads', 'public');
        }

        // Update user with all verification information
        // The users table stores a single full name and `dob`; there are no
        // first/middle/last/birthday columns.
        $fullName = trim(implode(' ', array_filter([
            $request->first_name,
            $request->middle_name,
            $request->last_name,
        ])));

        $user->update([
            'name' => $fullName ?: $user->name,
            'dob' => $request->birthday,
            'contact_number' => $request->contact_number,
            'address' => $request->address,
            'id_type' => $request->id_type,
            'id_image_path' => $idImagePath,
            'verification_status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Verification information submitted successfully. Awaiting admin approval.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Forgot password (send reset link)
     *  
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        // TODO: Implement password reset email logic
        // For now, just return success message

        return response()->json([
            'message' => 'Password reset link sent to your email.',
        ]);
    }

    /**
     * Get all users (Admin only)
     *  
     */
    public function getAllUsers(Request $request)
    {
        $query = User::with('hospitals');
        
        // Filter by role if provided
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        
        // Filter by verification status
        if ($request->has('verification_status')) {
            $query->where('verification_status', $request->verification_status);
        }
        
        $perPage = $request->input('per_page', 15);
        $users = $query->paginate($perPage);
        
        return response()->json($users);
    }

    /**
     * Update user assignment (Admin only)
     * 
     */
    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'nullable|string|max:50', 
            'phone' => 'nullable|string|max:20',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'birthday' => 'nullable|date',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'bloodType' => 'nullable|string|max:10',
            'patientId' => 'nullable|string',
            'emergencyContactName' => 'nullable|string',
            'emergencyContactPhone' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $validatedData = $validator->validated();

        // Map split-name/birthday inputs onto real columns (name, dob).
        $nameParts = array_filter([
            $validatedData['first_name'] ?? null,
            $validatedData['middle_name'] ?? null,
            $validatedData['last_name'] ?? null,
        ]);
        if (!empty($nameParts) && empty($validatedData['name'])) {
            $validatedData['name'] = implode(' ', $nameParts);
        }
        if (!empty($validatedData['birthday'])) {
            $validatedData['dob'] = $validatedData['birthday'];
        }
        unset(
            $validatedData['first_name'],
            $validatedData['middle_name'],
            $validatedData['last_name'],
            $validatedData['birthday'],
        );

        if (isset($validatedData['role'])) {
            $allowedRoles = ['patient', 'responder', 'admin', 'logistics', 'hospital_admin', 'dispatcher', 'procurement'];
            if (!in_array($validatedData['role'], $allowedRoles, true)) {
                return response()->json(['role' => ['Invalid role.']], 422);
            }
        }

        $user->update($validatedData);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh()->load('hospitals')
        ]);
    }

    /**
     * Update user hospital assignment (Admin only)
     * 
     */
    public function updateUserHospital(Request $request, $id)
    {
        $request->validate([
            'hospital_id' => 'nullable|exists:hospitals,id'
        ]);

        $user = User::findOrFail($id);

        if ($user->role !== 'logistics') {
            return response()->json([
                'message' => 'Only logistics users can be assigned to a hospital'
            ], 422);
        }

        if ($request->hospital_id) {
            $user->hospitals()->sync([$request->hospital_id]);
        } else {
            $user->hospitals()->detach();
        }

        return response()->json([
            'message' => 'Hospital assignment updated successfully',
            'user' => $user->load('hospitals'),
        ]);
    }

    /**
     * Activate user (Admin only)
     *  
     */
    public function activateUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => true]);
        
        return response()->json([
            'message' => 'User activated successfully',
            'user' => $user,
        ]);
    }

    /**
     * Deactivate user (Admin only)
     *  
     */
    public function deactivateUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => false]);
        
        return response()->json([
            'message' => 'User deactivated successfully',
            'user' => $user,
        ]);
    }
}