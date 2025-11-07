"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle } from "lucide-react"
import { useEffect as reactUseEffect } from "react"

interface LoginProps {
  onLogin: (user: {
    id: string
    email: string
    role: "super_admin" | "admin" | "employee" | "user"
    name: string
    company?: string
  }) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("login")

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  })

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [googleEmails, setGoogleEmails] = useState<string[] | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Login failed")
      }

      const data = await response.json()

      // Store token in localStorage for future API calls
      localStorage.setItem("token", data.access_token)

      // Use the role and user data directly from the auth response
      onLogin({
        id: data.user_id.toString(),
        email: loginForm.username, // We can use username as email for now, or get it from another endpoint if needed
        role: data.role,
        name: loginForm.username,
        company: undefined, // Can be fetched later if needed
      })
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validation
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (registerForm.password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("http://localhost:8000/api/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
        }),
      })
    

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Registration failed")
      }

      setSuccess("Account created successfully! Please login with your credentials.")
      setActiveTab("login")
      setRegisterForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      })
    } catch (err) {
      console.error("Registration error:", err)
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    try {
      // Redirect the browser to the Google login endpoint
      window.location.href = "http://localhost:8000/api/login/google";
    } catch (error) {
      console.error("Error during Google login:", error);
      setError("Failed to connect to Google login. Please try again.");
    }
  };

  const handleEmailSelection = async (email: string) => {
    try {
      const userCheckResponse = await fetch(`http://localhost:8000/user/check?email=${email}`);
      const userExists = await userCheckResponse.json();
      if (userExists) {
        // Redirect to login page
        setActiveTab("login");
      } else {
        // Pre-fill registration form
        setRegisterForm({ ...registerForm, email, name: "" });
      }
      setGoogleEmails(null); // Close the email selection modal
    } catch (error) {
      console.error("Error during email selection:", error);
      setError("Failed to process the selected email. Please try again.");
    }
  };

  reactUseEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    const name = params.get("name");

    if (token) {
      // If token is present, log the user in
      localStorage.setItem("token", token);
      fetch("http://localhost:8000/api/user/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch user info");
          }
          return response.json();
        })
        .then((user) => {
          onLogin(user); // Pass user info to parent component
          setActiveTab("dashboard"); // Redirect to dashboard
        })
        .catch((error) => {
          console.error("Error fetching user info:", error);
          setError("Failed to log in. Please try again.");
        });
    } else if (email && name) {
      // If email and name are present, pre-fill the registration form
      setRegisterForm({ ...registerForm, email, name });
      setActiveTab("register");
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
            RFP Response Generator
          </h1>
          <p className="text-gray-600">AI-powered proposal generation system</p>
        </div>

        <Card className="shadow-xl border-0 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-100 bg-gray-50/50">
              <TabsList className="grid w-full grid-cols-2 bg-transparent p-2">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl py-3 font-medium transition-all duration-200"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl py-3 font-medium transition-all duration-200"
                >
                  Register
                </TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-8">
              <TabsContent value="login" className="mt-0 space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                  <p className="text-gray-600">Sign in to your account to continue</p>
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="rounded-xl border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="username"
                        type="text"
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        className="pl-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="pl-10 pr-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold shadow-lg"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50 rounded-lg bg-transparent w-full h-12"
                    onClick={handleGoogleLogin}
                  >
                    Continue with Google
                  </Button>
              </TabsContent>

              <TabsContent value="register" className="mt-0 space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
                  <p className="text-gray-600">Join us to start generating RFP responses</p>
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="name"
                        type="text"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className="pl-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="reg-email"
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="pl-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="reg-password"
                          type={showPassword ? "text" : "password"}
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                          className="pl-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Password"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                        Confirm
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="confirm-password"
                          type={showPassword ? "text" : "password"}
                          value={registerForm.confirmPassword}
                          onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                          className="pl-10 h-12 rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Confirm"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl font-semibold shadow-lg"
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50 rounded-lg bg-transparent w-full h-12"
                    onClick={handleGoogleLogin}
                  >
                    Continue with Google
                  </Button> 
                </form>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 text-sm">What happens after registration?</h3>
                  <div className="space-y-2 text-xs text-blue-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>You'll be registered as a regular user</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Create a company to become an admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Choose subscription plan based on employees</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 RFP Response Generator. All rights reserved.</p>
        </div>
      </div>

      {/* Google Email Selection Modal */}
      {googleEmails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Select an Email</h3>
            <ul className="space-y-2">
              {googleEmails.map((email) => (
                <li key={email} className="email-item">
                  <button
                    onClick={() => handleEmailSelection(email)}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {email}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <button
                onClick={() => setGoogleEmails(null)}
                className="w-full h-12 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
function useEffect(arg0: () => void, arg1: never[]) {
  throw new Error("Function not implemented.")
}

