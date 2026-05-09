"use client";

import { useState } from "react";
import ImagePicker from "../ImagePicker";

// Wraps ImagePicker for the reviews form so the chosen Cloudinary URL is
// posted as `photo_url` when the surrounding server-action <form> submits.
// Also renders a small circular avatar preview so the admin can see exactly
// how the photo will look on the public site (where it's cropped to a
// circle next to the review text).
export default function PhotoField({
  defaultValue = "",
  name = "photo_url",
}: {
  defaultValue?: string;
  name?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  return (
    <div className="review-photo-field">
      <label className="admin-label">Customer photo (optional)</label>
      <p className="admin-help" style={{ marginTop: 0, marginBottom: 12 }}>
        When set, this photo replaces the coloured initials avatar on the public site.
      </p>
      <ImagePicker value={url} onChange={setUrl} folder="reviews" shape="avatar" />
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
