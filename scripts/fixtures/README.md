# Test fixtures

`schematic-6s.mp4` and `schematic-9s.mp4` are synthetic test clips (ffmpeg's `testsrc2` pattern, 160x90, 10 fps, VP9 in
an MP4 container, no audio; VP9 because the test browser has no H.264). They are seeded as the Fixture Beacon and
Fixture Lamp schematics (`scripts/seed-desktop-fixture.ts`) so `scripts/verify-equipment-directory.mjs` can check that
real videos turn in step on the shared clock. Made with:

    ffmpeg -f lavfi -i "testsrc2=size=160x90:rate=10:duration=6" -c:v libvpx-vp9 -b:v 60k -pix_fmt yuv420p -an -movflags +faststart -f mp4 schematic-6s.mp4

(and `duration=9` for the 9 s clip). Not real content.
