# Shop by Category - Image Update Solution

## Overview

This solution addresses the request to replace icons with respective images in the "Shop by Category" section on the home page. The CategoryGrid component is already designed to display images, we just need to update the database with the appropriate image paths.

## Current Implementation

The home page uses the `CategoryGrid` component (`components/home/CategoryGrid.jsx`) which:
- Fetches data from `/api/parent-collections`
- Displays `image_desktop` and `image_mobile` fields from the `parent_collections` table
- Shows a "No Image" placeholder when images are not set
- Has responsive design with proper image sizing

## Database Schema

The `parent_collections` table already has the necessary fields:
- `image_desktop` (text) - For desktop category images
- `image_mobile` (text) - For mobile category images
- `name`, `slug`, `is_active` - Standard collection fields

## Available Images

The following category images are already uploaded to `/public/uploads/`:

### Sports Categories
- **Cricket**: `1766324642324-295972127-Cricket.jpg`
- **Football**: `1766325274874-449197930-buy-Football-online.jpeg`
- **Basketball**: `1766325343693-856817141-Bascketball.jpeg`
- **Volleyball**: `1766325379045-234688888-Volleyballl.jpeg`

### General Categories
- **Team Sports**: `1766323229008-576900632-TeamSport.jpg`
- **Individual Games**: `1766324180816-433552644-IndividualGames.jpg`
- **Fitness & Training**: `1766324246576-975951444-FitnessTrainingEquipments.jpg`
- **Indoor Sports**: `1766324291541-584693456-IndoorSportsGoods.jpg`
- **Shoes & Clothing**: `1766316587194-345817537-ShoesClothing.jpg`

## Solution Options

### Option 1: Direct SQL Update (Recommended)

Run the SQL commands in `update-category-images.sql`:

```sql
-- Example for Cricket category
UPDATE parent_collections SET 
    image_desktop = '/uploads/1766324642324-295972127-Cricket.jpg',
    image_mobile = '/uploads/1766324642324-295972127-Cricket.jpg',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'cricket';
```

### Option 2: Admin Interface

1. Go to `/admin` in your application
2. Navigate to the Collection Manager
3. Edit each collection and upload/set the appropriate images
4. The admin interface already supports image upload via `ImageUploader` component

### Option 3: API Update

Use the API endpoints with the commands in `update-category-api-commands.txt`:

```bash
curl -X PUT http://localhost:3000/api/collections/[ID] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "image_desktop": "/uploads/1766324642324-295972127-Cricket.jpg",
    "image_mobile": "/uploads/1766324642324-295972127-Cricket.jpg"
  }'
```

## Category Mapping

| Category Name | Slug | Desktop Image | Mobile Image |
|---------------|------|---------------|-------------|
| Cricket | cricket | `/uploads/1766324642324-295972127-Cricket.jpg` | Same |
| Football | football | `/uploads/1766325274874-449197930-buy-Football-online.jpeg` | Same |
| Basketball | basketball | `/uploads/1766325343693-856817141-Bascketball.jpeg` | Same |
| Volleyball | volleyball | `/uploads/1766325379045-234688888-Volleyballl.jpeg` | Same |
| Team Sports | team-sports | `/uploads/1766323229008-576900632-TeamSport.jpg` | Same |
| Individual Games | individual-games | `/uploads/1766324180816-433552644-IndividualGames.jpg` | Same |
| Fitness & Training | fitness-training | `/uploads/1766324246576-975951444-FitnessTrainingEquipments.jpg` | Same |
| Indoor Sports | indoor-sports | `/uploads/1766324291541-584693456-IndoorSportsGoods.jpg` | Same |
| Shoes & Clothing | shoes-clothing | `/uploads/1766316587194-345817537-ShoesClothing.jpg` | Same |

## Frontend Behavior

Once the database is updated, the CategoryGrid component will automatically:

1. **Fetch the updated data** from `/api/parent-collections`
2. **Display the images** instead of "No Image" placeholders
3. **Apply proper styling** with hover effects and overlays
4. **Maintain responsive design** for mobile and desktop views

The component handles:
- Image optimization with Next.js `<Image>` component
- Proper aspect ratios and sizing
- Hover effects with scale transforms
- Gradient overlays for text readability
- Fallback to "No Image" if images are missing

## Files Created

1. **`update-category-images.sql`** - SQL commands for direct database update
2. **`update-category-api-commands.txt`** - API curl commands for programmatic update
3. **`apply-category-images.js`** - Script to generate the above files

## Verification

After applying the updates:

1. **Check the database**: Verify `image_desktop` and `image_mobile` fields are populated
2. **Check the API**: Visit `/api/parent-collections` to see the updated data
3. **Check the frontend**: Visit the home page to see the images displayed
4. **Check admin interface**: View collections in the admin panel

## Notes

- All images are already uploaded and available in the `/public/uploads/` directory
- The CategoryGrid component is already properly configured to display these images
- No frontend code changes are required - only database updates
- Images will be served with proper Next.js optimization
- The solution maintains existing responsive design and accessibility features

## Next Steps

1. **Choose your update method** (SQL, Admin Interface, or API)
2. **Apply the updates** using the provided files/commands
3. **Verify the changes** on the home page
4. **Test responsive behavior** on different screen sizes

The "Shop by Category" section will now display proper category images instead of generic icons or placeholders.
