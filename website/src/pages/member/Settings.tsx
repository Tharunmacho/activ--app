import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, MapPin, Save, Camera, Menu } from "lucide-react";
import MemberSidebar from "./MemberSidebar";
import MemberTopBar from "@/features/member/components/MemberTopBar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/services/activApi";
import { useProfile } from "@/contexts/ProfileContext";

/**
 * A stored Boolean, as the form's yes/no strings.
 *
 * `doingBusiness`, `memberOfOtherChamber` and `filedITR` are Booleans in the
 * database and yes/no strings in these inputs. `value || ""` turned a stored
 * `false` into the empty string — indistinguishable from "never answered" — so
 * a member who had said "no" reopened the page with the question blank.
 */
const yesNoText = (value: unknown): string => {
    if (value === true) return "yes";
    if (value === false) return "no";
    return String(value ?? "");
};

const MemberSettings = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { memberType } = useProfile();
    const isAspirant = memberType === 'Standard';

    /**
     * Whether this member sees the paid sections.
     *
     * The same localStorage key the sidebar gates its navigation on, so the menu
     * and this page cannot disagree about who the member is.
     */
    const isPaid = (() => {
        try {
            return localStorage.getItem('paymentStatus') === 'completed';
        } catch {
            return false;
        }
    })();
    const [profilePhoto, setProfilePhoto] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    
    const [formData, setFormData] = useState({
        // Personal Information (matches PersonalForm model)
        name: "",
        email: "",
        phoneNumber: "",
        city: "",
        state: "",
        district: "",
        block: "",
        religion: "",
        socialCategory: "",
        
        // Business Information (matches BusinessForm model)
        doingBusiness: "",
        organization: "",
        constitution: "",
        businessTypes: [] as string[],
        businessActivities: "",
        businessYear: "",
        employees: "",
        chamber: "",
        chamberDetails: "",
        govtOrgs: [] as string[],
        
        // Declaration Information (matches DeclarationForm model)
        sisterConcerns: "",
        companyNames: [] as string[],
        declarationAccepted: false,
        
        // Financial Information (matches FinancialForm model)
        pan: "",
        gst: "",
        udyam: "",
        filedITR: "",
        turnoverRange: "",
        govtSchemes: "",
    });

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Parallel fetch all data at once for faster loading
            const [personalRes, businessRes, declarationRes, financialRes] = await Promise.all([
                // Fetched once. The same endpoint was requested twice in this
                // very list, and both results fed the same form.
                apiFetch('/members/my-profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                apiFetch('/members/business-info', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                apiFetch('/members/declaration-info', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                apiFetch('/members/financial-info', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            // Process user data
            if (personalRes.ok) {
                const userResult = await personalRes.clone().json();
                if (userResult.success && userResult.data) {
                    setProfilePhoto(userResult.data.profilePhoto || "");
                }
            }

            // Process personal form data
            if (personalRes.ok) {
                const personalResult = await personalRes.json();
                if (personalResult.success && personalResult.data) {
                    const data = personalResult.data;
                    setFormData(prev => ({
                        ...prev,
                        name: data.name || "",
                        email: data.email || "",
                        phoneNumber: data.phoneNumber || "",
                        city: data.city || "",
                        state: data.state || "",
                        district: data.district || "",
                        block: data.block || "",
                        religion: data.religion || "",
                        socialCategory: data.socialCategory || ""
                    }));
                }
            }

            // Process business form data
            if (businessRes.ok) {
                const businessResult = await businessRes.json();
                if (businessResult.success && businessResult.data) {
                    /*
                      * The names `GET /members/business-info` returns.
                      *
                      * It answers `organizationName`, `constitutionType`,
                      * `businessCommencementYear`, `numberOfEmployees`,
                      * `memberOfOtherChamber` and `govtOrganizations`; this read
                      * the form's shorthand, so all six came back `undefined`
                      * and the fields rendered empty over data that existed.
                      * Saving then wrote those blanks back.
                      */
                    setFormData(prev => ({
                        ...prev,
                        doingBusiness: yesNoText(businessResult.data.doingBusiness),
                        organization: businessResult.data.organizationName || businessResult.data.organization || "",
                        constitution: businessResult.data.constitutionType || businessResult.data.constitution || "",
                        businessTypes: businessResult.data.businessTypes || [],
                        businessActivities: businessResult.data.businessActivities || "",
                        businessYear: String(businessResult.data.businessCommencementYear || businessResult.data.businessYear || ""),
                        employees: String(businessResult.data.numberOfEmployees || businessResult.data.employees || ""),
                        chamber: yesNoText(businessResult.data.memberOfOtherChamber ?? businessResult.data.chamber),
                        chamberDetails: businessResult.data.otherChamber || businessResult.data.chamberDetails || "",
                        govtOrgs: businessResult.data.govtOrganizations || businessResult.data.govtOrgs || []
                    }));
                }
            }

            // Process declaration form data
            if (declarationRes.ok) {
                const declarationResult = await declarationRes.json();
                if (declarationResult.success && declarationResult.data) {
                    setFormData(prev => ({
                        ...prev,
                        sisterConcerns: String(declarationResult.data.sisterConcerns ?? ""),
                        companyNames: declarationResult.data.companyNames || [],
                        // `agreeToDeclaration` is what the endpoint returns.
                        declarationAccepted: declarationResult.data.agreeToDeclaration === true
                    }));
                }
            }

            // Process financial form data
            if (financialRes.ok) {
                const financialResult = await financialRes.json();
                if (financialResult.success && financialResult.data) {
                    setFormData(prev => ({
                        ...prev,
                        // `panNumber` / `gstNumber` / `udyamNumber` — the three
                        // identifiers a member is most likely to come here to
                        // correct, and the three that were rendering blank.
                        pan: financialResult.data.panNumber || financialResult.data.pan || "",
                        gst: financialResult.data.gstNumber || financialResult.data.gst || "",
                        udyam: financialResult.data.udyamNumber || financialResult.data.udyam || "",
                        filedITR: yesNoText(financialResult.data.filedITR),
                        turnoverRange: financialResult.data.turnoverRange || "",
                        govtSchemes: financialResult.data.govtSchemes || [],
                    }));
                }
            }

        } catch (error) {
            console.error('Error loading user data:', error);
            toast.error('Failed to load settings data');
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        setIsUploadingPhoto(true);
        try {
            /**
             * Multipart, POST, and the file itself.
             *
             * This previously sent a base64 string as JSON to
             * `PUT /members/profile-photo` — a route that does not exist (the
             * method is POST) against a handler that reads `req.files`. Every
             * upload 404'd, and because the failure was only logged the member
             * saw their photo appear locally and vanish on reload.
             *
             * `photo` is the field name the mobile app uses; the route accepts
             * any field via `upload.any()`, so both clients work unchanged.
             */
            const form = new FormData();
            form.append('photo', file);

            const token = localStorage.getItem('token');
            const response = await apiFetch('/members/profile-photo', {
                method: 'POST',
                // No Content-Type: the browser must set the multipart boundary
                // itself, and naming it here produces a body the server cannot
                // parse.
                headers: { 'Authorization': `Bearer ${token}` },
                body: form,
            });

            if (response.ok) {
                const result = await response.json();
                const url = result?.data?.profilePhoto || result?.data?.url || '';
                if (url) setProfilePhoto(url);
                toast.success('Profile photo updated');
                window.dispatchEvent(new Event('profileDataUpdated'));
            } else {
                // A failed upload must say so. Silently keeping the local
                // preview is what made this look like it worked.
                toast.error('Could not upload the photo. Please try again.');
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error('Error uploading photo');
            setIsUploadingPhoto(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');

            // Update personal form - POST works, PUT has issues
            const personalResponse = await apiFetch('/members/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    // `fullName`, not `name`. The controller reads
                    // `profileData.fullName`; anything else is dropped without
                    // an error, so the form reported success and changed nothing.
                    fullName: formData.name,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    city: formData.city,
                    state: formData.state,
                    district: formData.district,
                    block: formData.block,
                    religion: formData.religion,
                    socialCategory: formData.socialCategory
                })
            });

            // Update business form - POST works
            let businessResponse = { ok: true };
            if (!isAspirant) {
                businessResponse = await apiFetch('/members/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                /*
                  * The names the schema stores, not the form's own shorthand.
                  *
                  * `organization`, `constitution`, `businessYear`, `employees`,
                  * `chamber` and `govtOrgs` are not keys `updateMember` reads,
                  * so Mongoose strict mode dropped all six on every save while
                  * the response said 200 and the toast said "saved". Six
                  * corrections a member made here never reached the database.
                  */
                body: JSON.stringify({
                    doingBusiness: formData.doingBusiness,
                    organizationName: formData.organization,
                    constitutionType: formData.constitution,
                    businessTypes: formData.businessTypes,
                    businessActivities: formData.businessActivities,
                    businessCommencementYear: formData.businessYear,
                    numberOfEmployees: formData.employees,
                    memberOfOtherChamber: formData.chamber || undefined, // undefined, not '' — see asBool
                    otherChamber: formData.chamberDetails,
                    govtOrganizations: formData.govtOrgs
                })
                });
            }

            // Update declaration form - POST works
            const declarationResponse = await apiFetch('/members/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // `agreeToDeclaration` is the stored field; `declarationAccepted`
                // is not a key the server reads, so the consent was recorded as
                // false for everyone who saved from here.
                body: JSON.stringify({
                    sisterConcerns: formData.sisterConcerns,
                    companyNames: formData.companyNames,
                    agreeToDeclaration: formData.declarationAccepted
                })
            });

            // Update financial form - POST works
            let financialResponse = { ok: true };
            if (!isAspirant) {
                financialResponse = await apiFetch('/members/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                // Same again: `panNumber`, not `pan`. The three identifiers a
                // member is most likely to correct were the three being lost.
                body: JSON.stringify({
                    panNumber: formData.pan,
                    gstNumber: formData.gst,
                    udyamNumber: formData.udyam,
                    filedITR: formData.filedITR || undefined,
                    turnoverRange: formData.turnoverRange,
                    govtSchemes: formData.govtSchemes || undefined,
                })
                });
            }

            if (personalResponse.ok) {
                // Also update the user profile (fullName) in the User model
                const updateRes = await apiFetch('/members/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        fullName: formData.name,
                        email: formData.email
                    })
                });

                if (updateRes.ok) {
                    toast.success("Profile updated successfully!");
                    // Update localStorage
                    localStorage.setItem('userName', formData.name);
                    localStorage.setItem('userEmail', formData.email);
                    if (formData.organization) {
                        localStorage.setItem('userOrganization', formData.organization);
                    }
                    // Dispatch events to update sidebar immediately
                    window.dispatchEvent(new CustomEvent('userDataUpdated'));
                    window.dispatchEvent(new CustomEvent('profileDataUpdated'));
                    if (formData.organization) {
                        window.dispatchEvent(new CustomEvent('companyUpdated'));
                    }
                    
                    // No need to reload - sidebar will update via events
                    loadUserData();
                } else {
                    toast.success("Profile forms updated!");
                    // Update localStorage even if user profile API fails
                    localStorage.setItem('userName', formData.name);
                    localStorage.setItem('userEmail', formData.email);
                    if (formData.organization) {
                        localStorage.setItem('userOrganization', formData.organization);
                    }
                    window.dispatchEvent(new CustomEvent('userDataUpdated'));
                    window.dispatchEvent(new CustomEvent('profileDataUpdated'));
                    if (formData.organization) {
                        window.dispatchEvent(new CustomEvent('companyUpdated'));
                    }
                    loadUserData();
                }
            } else {
                toast.error("Failed to update profile");
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error("Error updating profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-white font-sans">
                <MemberSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <MemberSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-[5.5rem] shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-6 z-10">
                    <button
                        type="button"
                        className="lg:hidden text-slate-500 hover:text-slate-700 shrink-0"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="min-w-0">
                        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 truncate">
                            Settings
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5 truncate hidden sm:block">
                            Manage your profile and account preferences
                        </p>
                    </div>

                    <div className="ml-auto flex items-center gap-2 shrink-0">
                        <MemberTopBar />
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-6 overflow-auto">
                    <div className="max-w-[90rem] space-y-6">
                        {/* Profile Photo Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Photo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <Avatar className="w-24 h-24">
                                            <AvatarImage src={profilePhoto || undefined} />
                                            <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                                                {formData.name ? formData.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isUploadingPhoto && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                            id="photo-upload"
                                        />
                                        <label htmlFor="photo-upload">
                                            <Button
                                                type="button"
                                                onClick={() => document.getElementById('photo-upload')?.click()}
                                                disabled={isUploadingPhoto}
                                                className="cursor-pointer"
                                            >
                                                <Camera className="h-4 w-4 mr-2" />
                                                {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                                            </Button>
                                        </label>
                                        <p className="text-xs text-slate-500 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Profile Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4" />
                                            Full Name
                                        </Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter your full name"
                                        />
                                    </div>

                                    <div>
                                        <Label className="flex items-center gap-2 mb-2">
                                            <Mail className="h-4 w-4" />
                                            Email
                                        </Label>
                                        <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="your.email@example.com"
                                        />
                                    </div>

                                    <div>
                                        <Label className="flex items-center gap-2 mb-2">
                                            <Phone className="h-4 w-4" />
                                            Phone Number
                                        </Label>
                                        <Input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>

                                    <div>
                                        <Label className="flex items-center gap-2 mb-2">
                                            <MapPin className="h-4 w-4" />
                                            City
                                        </Label>
                                        <Input
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Enter city"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">State</Label>
                                        <Input
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            placeholder="Enter state"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">District</Label>
                                        <Input
                                            value={formData.district}
                                            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                            placeholder="Enter district"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Block</Label>
                                        <Input
                                            value={formData.block}
                                            onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                                            placeholder="Enter block"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Religion</Label>
                                        <Input
                                            value={formData.religion}
                                            onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                                            placeholder="Enter religion"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Social Category</Label>
                                        <Input
                                            value={formData.socialCategory}
                                            onChange={(e) => setFormData({ ...formData, socialCategory: e.target.value })}
                                            placeholder="Enter social category"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/*
                          * Business, financial and declaration — paid members only.
                          *
                          * Mobile gives an unpaid member `EditProfileScreen`: seven
                          * personal fields and nothing else. These three sections belong
                          * to `PaidSettingsScreen`, which an unpaid member has no route
                          * to. Reaching them here through "Edit Profile" let an unpaid
                          * member edit a business record they cannot yet have, and did it
                          * by walking past the paid-only gate on the sidebar entry.
                          *
                          * Each form also has its own dedicated screen at
                          * `/member/forms/*`, which is where they are filled in during
                          * registration. This is for corrections afterwards.
                          */}
                        {isPaid && (
                        <>
                        {!isAspirant && (
                        <>
                        {/* Business Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Business Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="mb-2">Doing Business</Label>
                                        <Input
                                            value={formData.doingBusiness}
                                            onChange={(e) => setFormData({ ...formData, doingBusiness: e.target.value })}
                                            placeholder="Yes/No"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Organization Name</Label>
                                        <Input
                                            value={formData.organization}
                                            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                            placeholder="Enter organization name"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Constitution</Label>
                                        <Input
                                            value={formData.constitution}
                                            onChange={(e) => setFormData({ ...formData, constitution: e.target.value })}
                                            placeholder="Enter constitution type"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Business Year</Label>
                                        <Input
                                            value={formData.businessYear}
                                            onChange={(e) => setFormData({ ...formData, businessYear: e.target.value })}
                                            placeholder="Enter business year"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Number of Employees</Label>
                                        <Input
                                            value={formData.employees}
                                            onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
                                            placeholder="Enter employee count"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Chamber Membership</Label>
                                        <Input
                                            value={formData.chamber}
                                            onChange={(e) => setFormData({ ...formData, chamber: e.target.value })}
                                            placeholder="Yes/No"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <Label className="mb-2">Chamber Details</Label>
                                        <Input
                                            value={formData.chamberDetails}
                                            onChange={(e) => setFormData({ ...formData, chamberDetails: e.target.value })}
                                            placeholder="Enter chamber details"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <Label className="mb-2">Business Activities</Label>
                                        <Input
                                            value={formData.businessActivities}
                                            onChange={(e) => setFormData({ ...formData, businessActivities: e.target.value })}
                                            placeholder="Enter business activities"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Financial Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Financial & Compliance Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="mb-2">PAN Number</Label>
                                        <Input
                                            value={formData.pan}
                                            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                                            placeholder="Enter PAN number"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">GST Number</Label>
                                        <Input
                                            value={formData.gst}
                                            onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                                            placeholder="Enter GST number"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Udyam Number</Label>
                                        <Input
                                            value={formData.udyam}
                                            onChange={(e) => setFormData({ ...formData, udyam: e.target.value })}
                                            placeholder="Enter Udyam number"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Filed ITR</Label>
                                        <Input
                                            value={formData.filedITR}
                                            onChange={(e) => setFormData({ ...formData, filedITR: e.target.value })}
                                            placeholder="Yes/No"
                                        />
                                    </div>


                                    <div>
                                        <Label className="mb-2">Turnover Range</Label>
                                        <Input
                                            value={formData.turnoverRange}
                                            onChange={(e) => setFormData({ ...formData, turnoverRange: e.target.value })}
                                            placeholder="Enter turnover range"
                                        />
                                    </div>




                                    <div>
                                        <Label className="mb-2">Government Schemes</Label>
                                        <Input
                                            value={formData.govtSchemes}
                                            onChange={(e) => setFormData({ ...formData, govtSchemes: e.target.value })}
                                            placeholder="Yes/No"
                                        />
                                    </div>



                                </div>
                            </CardContent>
                        </Card>
                        </>
                        )}

                        {/* Declaration Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Declaration Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="mb-2">Sister Concerns</Label>
                                        <Input
                                            value={formData.sisterConcerns}
                                            onChange={(e) => setFormData({ ...formData, sisterConcerns: e.target.value })}
                                            placeholder="Enter sister concerns"
                                        />
                                    </div>

                                    <div>
                                        <Label className="mb-2">Declaration Accepted</Label>
                                        <Input
                                            value={formData.declarationAccepted ? "Yes" : "No"}
                                            onChange={(e) => setFormData({ ...formData, declarationAccepted: e.target.value.toLowerCase() === "yes" })}
                                            placeholder="Yes/No"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        </>
                        )}

                        {/*
                          * Why an applicant sees one section and not four.
                          *
                          * Settings is in the rail from the day the account exists
                          * now, so an applicant reaches this screen while their
                          * business, financial and declaration forms are still with
                          * the review team — locked on purpose, because a file that
                          * changes underneath a reviewer is a file nobody has
                          * actually approved. Without this note the screen reads as
                          * three missing sections; with it, it reads as three
                          * sections that are exactly where they should be.
                          */}
                        {!isPaid && (
                        <Card className="border-blue-100 bg-blue-50/60">
                            <CardContent className="pt-6">
                                <p className="text-sm font-bold text-slate-900">
                                    Your application forms are locked while they are in review
                                </p>
                                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                                    Your contact details above can be changed at any time. The business,
                                    financial and declaration sections were submitted with your application
                                    and stay as the review team received them. If one of them needs a
                                    correction, send it from{' '}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/member/help')}
                                        className="font-semibold text-blue-700 hover:underline"
                                    >
                                        Help &amp; Support
                                    </button>{' '}
                                    with your application reference.
                                </p>
                            </CardContent>
                        </Card>
                        )}

                        {/* Save Button */}
                        <Card>
                            <CardContent className="pt-6">
                                <Button 
                                    onClick={handleSave} 
                                    disabled={saving}
                                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "Saving..." : "Save All Changes"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberSettings;
