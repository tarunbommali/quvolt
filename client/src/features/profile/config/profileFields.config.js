// features/profile/config/profileFields.config.js

export const PROFILE_FIELDS = {
  FREE: [
    { key: 'name', label: 'Name', required: true },
    { key: 'profilePhoto', label: 'Profile Image' },
    { key: 'city', label: 'City' },
    { key: 'bio', label: 'Bio', type: 'textarea' },
  ],

  CREATOR: [
    { key: 'name', label: 'Creator Name', required: true },
    { key: 'profilePhoto', label: 'Brand Logo', highlight: true },
    { key: 'bio', label: 'About Creator', type: 'textarea', highlight: true },
    { key: 'contentCategory', label: 'Category' },
    { key: 'socialLinks', label: 'Social Links' },
  ],

  TEAMS: [
    { key: 'institutionName', label: 'Organization Name', highlight: true },
    { key: 'institutionWebsite', label: 'Website', highlight: true },
    { key: 'contactEmail', label: 'Business Email', highlight: true },
    { key: 'contactPhone', label: 'Phone' },
    { key: 'institutionAddress', label: 'Address' },
  ],

  HOST: [
    { key: 'institutionName', label: 'Institution Name' },
    { key: 'institutionType', label: 'Type' },
    { key: 'contactPhone', label: 'Phone' },
  ],
};
