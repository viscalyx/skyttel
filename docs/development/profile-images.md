# Profile image persistence

This guide is for developers extending household content, export, import,
or permanent erasure. Profile images are independent object facts. Keep
`profileImageId` when changing unrelated fields or types and when merging
objects. The current image endpoints use the same private draft and durable
whole-save receipt as other object changes.

## Encoding and requests

The authenticated image endpoint accepts a raw request body of at most
10,000,000 bytes. Only this upload route has the larger body limit; ordinary
JSON routes retain their 16,384-byte limit. Origin, build identity, household
membership, content version, draft version and object revision are checked.
The server checks them again after asynchronous decoding, before inserting
the encoded image and updating its draft reference in one transaction.

Sharp accepts actual JPEG, PNG and WebP content with at most 40 million
input pixels, applies orientation, keeps the aspect ratio without
enlargement, and encodes the first frame as WebP at quality 80. Metadata is
not retained. Output is bounded to 300 × 300 pixels and 262,144 bytes. The
database also enforces these output bounds. Native runtime decoding and
restart persistence are checked in the production container.

See the upstream [constructor](https://sharp.pixelplumbing.com/api-constructor/)
and [output documentation](https://sharp.pixelplumbing.com/api-output/).

## Inventory for export, import and erasure

The `profile_image` table stores stable image IDs, household and object
ownership, creator identity, encoded bytes, width and height. It contains
only encoded output. `map_object.profileImageId` references the current
image, including retained removed objects. Image IDs also occur in object
values in the following JSON:

- `map_draft.changes`: `before` and `after`, including undo proposals.
- `map_save.receipt`: `changes[].before` and `changes[].after`.
- `map_history.changes`: the same saved object changes used for history.

Preserve all of these references and the needed BLOBs together during full
export and import. Validate household and object ownership, image bounds,
format and missing references before an atomic import. Remap creator and
draft-owner identities through the import identity mapping. Restoring old
content must not restore old access. These workflows are implemented in
their own work items; the image routes do not provide import or erasure.

Reading bytes requires current membership plus a reference from the shared
object or saved receipt, or the requesting user's own draft. Knowing an ID
or being the original uploader is insufficient. Images can only be attached
to their owning object. Shared and historical images are readable by all
current members. Another member's unsaved image is not readable. Ordinary
map and history JSON contain IDs, never image bytes. Image responses use
`Cache-Control: no-store` and the application's content security policy.

Draft writes remove image BLOBs with no remaining object, receipt or draft
reference. Saved history retains needed versions indefinitely. Permanent
erasure must remove affected references from all listed locations, including
removed objects and every user's draft, before deleting their image BLOBs.
It must also invalidate affected in-memory client views. The image module
has no disk thumbnail cache or public static image path. Access failures and
image-processing errors never include image bytes, metadata or household
text in technical diagnostics.
