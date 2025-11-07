"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle, Loader2, Shield } from "lucide-react"
import Link from "next/link"

interface LoginProps {
  onLogin: (user: {
    id: string
    email: string
    role: "super_admin" | "admin" | "employee" | "user"
    name: string
    company?: string
  }) => void
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}



export default function Login({ onLogin }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("login")

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  })

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
    name?: string
  }>({})

  const [googleEmails, setGoogleEmails] = useState<string[] | null>(null)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get("token")
      const email = params.get("email")
      const name = params.get("name")
      let role = params.get("role")

      if (token && role) {
        localStorage.setItem("token", token)
        role = role.toLowerCase().split(".").pop()!

        onLogin({
          id: "",
          email: email || "",
          name: name || "",
          role: role as any,
        })

        const redirectPaths = {
          admin: "/api/admin/dashboard",
          employee: "/api/employee/dashboard",
          super_admin: "/api/admin/dashboard",
          user: "/user/dashboard",
        }

        window.location.href = redirectPaths[role as keyof typeof redirectPaths] || "/user/dashboard"
      } else if (email && name) {
        setRegisterForm((prev) => ({ ...prev, email, name }))
        setActiveTab("register")
      }
    } catch (error) {
      console.error("Error processing URL parameters:", error)
      setError("Invalid login parameters. Please try again.")
    }
  }, [onLogin])

  const validateLoginForm = () => {
    const errors: typeof validationErrors = {}

    if (!loginForm.email) {
      errors.email = "Email is required"
    } else if (!validateEmail(loginForm.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!loginForm.password) {
      errors.password = "Password is required"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateRegisterForm = () => {
    const errors: typeof validationErrors = {}

    if (!registerForm.name.trim()) {
      errors.name = "Full name is required"
    } else if (registerForm.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long"
    }

    if (!registerForm.email) {
      errors.email = "Email is required"
    } else if (!validateEmail(registerForm.email)) {
      errors.email = "Please enter a valid email address"
    }

    // const passwordValidation = validatePassword(registerForm.password)
    // if (!passwordValidation.isValid) {
    //   errors.password = passwordValidation.errors[0]
    // }

    if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateLoginForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginForm.email.trim().toLowerCase(),
          password: loginForm.password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Login failed (${response.status})`)
      }

      const data = await response.json()

      if (!data.access_token) {
        throw new Error("Invalid response from server")
      }

      localStorage.setItem("token", data.access_token)

      onLogin({
        id: data.user_id?.toString() || "",
        email: loginForm.email.trim().toLowerCase(),
        role: data.role || "user",
        name: data.name || loginForm.email.split("@")[0],
        company: data.company,
      })

      setSuccess("Login successful! Redirecting...")
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateRegisterForm()) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("http://localhost:8000/api/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerForm.name.trim(),
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `Registration failed (${response.status})`)
      }

      setSuccess("Account created successfully! Please check your email for verification instructions.")
      setActiveTab("login")
      setRegisterForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      })
      setValidationErrors({})
    } catch (err) {
      console.error("Registration error:", err)
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    try {
      setError(null)
      window.location.href = "http://localhost:8000/api/login/google"
    } catch (error) {
      console.error("Error during Google login:", error)
      setError("Failed to connect to Google login. Please try again.")
    }
  }

  const handleEmailSelection = async (email: string) => {
    try {
      setError(null)
      const userCheckResponse = await fetch(`http://localhost:8000/api/user/check?email=${encodeURIComponent(email)}`)

      if (!userCheckResponse.ok) {
        throw new Error("Failed to verify email")
      }

      const userExists = await userCheckResponse.json()

      if (userExists) {
        setLoginForm((prev) => ({ ...prev, email }))
        setActiveTab("login")
        setSuccess("Please enter your password to continue")
      } else {
        setRegisterForm((prev) => ({ ...prev, email, name: "" }))
        setActiveTab("register")
      }

      setGoogleEmails(null)
    } catch (error) {
      console.error("Error during email selection:", error)
      setError("Failed to process the selected email. Please try again.")
      setGoogleEmails(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl mb-6 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-3">
            RFP Response Generator
          </h1>
          <p className="text-gray-600 text-lg">AI-powered proposal generation system</p>
        </div>

        <Card className="shadow-2xl border-0 overflow-hidden backdrop-blur-sm bg-white/95">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div>
              <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-4 font-semibold transition-colors duration-300 text-base rounded-none hover:bg-transparent hover:text-gray-900"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 py-4 font-semibold transition-colors duration-300 text-base rounded-none hover:bg-transparent hover:text-gray-900"
                >
                  Create Account
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
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50/80 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="rounded-xl border-green-200 bg-green-50/80 backdrop-blur-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        value={loginForm.email}
                        onChange={(e) => {
                          setLoginForm({ ...loginForm, email: e.target.value })
                          if (validationErrors.email) {
                            setValidationErrors((prev) => ({ ...prev, email: undefined }))
                          }
                        }}
                        className={`pl-10 h-12 rounded-xl border-2 transition-all duration-200 ${
                          validationErrors.email
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-sm text-red-600 font-medium">{validationErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={loginForm.password}
                        onChange={(e) => {
                          setLoginForm({ ...loginForm, password: e.target.value })
                          if (validationErrors.password) {
                            setValidationErrors((prev) => ({ ...prev, password: undefined }))
                          }
                        }}
                        className={`pl-10 pr-10 h-12 rounded-xl border-2 transition-all duration-200 ${
                          validationErrors.password
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="text-sm text-red-600 font-medium">{validationErrors.password}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 font-medium">Or continue with</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 rounded-xl font-semibold transition-all duration-200 bg-transparent"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="text-center">
                  <Link
                    href="/forgetpassword"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="register" className="mt-0 space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
                  <p className="text-gray-600">Join us to start generating RFP responses</p>
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50/80 backdrop-blur-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="name"
                        type="text"
                        value={registerForm.name}
                        onChange={(e) => {
                          setRegisterForm({ ...registerForm, name: e.target.value })
                          if (validationErrors.name) {
                            setValidationErrors((prev) => ({ ...prev, name: undefined }))
                          }
                        }}
                        className={`pl-10 h-12 rounded-xl border-2 transition-all duration-200 ${
                          validationErrors.name
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    {validationErrors.name && (
                      <p className="text-sm text-red-600 font-medium">{validationErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-sm font-semibold text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="reg-email"
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => {
                          setRegisterForm({ ...registerForm, email: e.target.value })
                          if (validationErrors.email) {
                            setValidationErrors((prev) => ({ ...prev, email: undefined }))
                          }
                        }}
                        className={`pl-10 h-12 rounded-xl border-2 transition-all duration-200 ${
                          validationErrors.email
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-sm text-red-600 font-medium">{validationErrors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-sm font-semibold text-gray-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="reg-password"
                          type={showPassword ? "text" : "password"}
                          value={registerForm.password}
                          onChange={(e) => {
                            setRegisterForm({ ...registerForm, password: e.target.value })
                            if (validationErrors.password) {
                              setValidationErrors((prev) => ({ ...prev, password: undefined }))
                            }
                          }}
                          className={`pl-10 h-12 rounded-xl border-2 transition-all duration-200 ${
                            validationErrors.password
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                          placeholder="Password"
                          required
                        />
                      </div>
                      {validationErrors.password && (
                        <p className="text-xs text-red-600 font-medium">{validationErrors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">
                        Confirm
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={registerForm.confirmPassword}
                          onChange={(e) => {
                            setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                            if (validationErrors.confirmPassword) {
                              setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                            }
                          }}
                          className={`pl-10 pr-10 h-12 rounded-xl border-2 transition-all duration-200 ${
                            validationErrors.confirmPassword
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                          placeholder="Confirm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {validationErrors.confirmPassword && (
                        <p className="text-xs text-red-600 font-medium">{validationErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-xl font-semibold shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500 font-medium">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 rounded-xl font-semibold transition-all duration-200 bg-transparent"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </form>

                <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                  <h3 className="font-bold text-blue-900 mb-3 text-sm flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    What happens after registration?
                  </h3>
                  <div className="space-y-2.5 text-xs text-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      <span>You'll be registered as a regular user with full access</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      <span>Create a company profile to unlock admin features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      <span>Choose subscription plan based on team size</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 RFP Response Generator. All rights reserved.</p>
          <p className="mt-1 text-xs">Secure • Reliable • AI-Powered</p>
        </div>
      </div>

      {googleEmails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-0 overflow-hidden">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Select Your Email</h3>
              <p className="text-gray-600 text-sm">Choose which email to use for your account</p>
            </div>

            <div className="space-y-2 mb-6">
              {googleEmails.map((email) => (
                <button
                  key={email}
                  onClick={() => handleEmailSelection(email)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{email}</span>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={() => setGoogleEmails(null)}
              variant="outline"
              className="w-full h-11 rounded-xl border-2 font-semibold"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
