import os
import tempfile
import unittest
import zipfile
from io import BytesIO
from pathlib import Path
from unittest import mock

import app as app_module
import config


class AppTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.music = base / "music"
        self.playlists = base / "playlists"
        (self.music / "Artist (12345678-1234-5678-9012-345678901234)" / "Album").mkdir(parents=True)
        (self.music / "Artist (12345678-1234-5678-9012-345678901234)" / "Album" / "01 - Song.mp3").write_bytes(b"a")
        (self.music / "Artist (12345678-1234-5678-9012-345678901234)" / "Album" / "cover.jpg").write_bytes(b"c")
        (self.music / "Guns N' Roses").mkdir()
        (self.music / "Guns N' Roses" / "02 - Track.flac").write_bytes(b"b")
        self.playlists.mkdir()
        # A sibling directory whose name starts with the music root's name
        (base / "music-private").mkdir()
        (base / "music-private" / "secret.mp3").write_bytes(b"s")

        patcher = mock.patch.multiple(config, MUSIC_ROOT=str(self.music), PLAYLIST_ROOT=str(self.playlists))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.tmp.cleanup)
        self.client = app_module.app.test_client()

    def save(self, name, tracks, new_name=None):
        body = {"tracks": tracks}
        if new_name is not None:
            body["newName"] = new_name
        return self.client.put(f"/api/playlist/{name}", json=body)


class TestPlaylists(AppTestCase):
    def test_save_writes_m3u8_relative_to_playlist_folder(self):
        r = self.save("Road Trip", ["Guns N' Roses/02 - Track.flac"])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json["status"], "created")
        content = (self.playlists / "Road Trip.m3u8").read_text(encoding="utf-8")
        self.assertEqual(content, "#EXTM3U\n../Guns N' Roses/02 - Track.flac\n")

    def test_get_strips_relative_prefix(self):
        self.save("Mix", ["Guns N' Roses/02 - Track.flac"])
        r = self.client.get("/api/playlist/Mix")
        self.assertEqual(r.json["tracks"], ["Guns N' Roses/02 - Track.flac"])

    def test_list_search_and_paging(self):
        for n in ("Alpha", "Beta", "Gamma"):
            self.save(n, [])
        r = self.client.get("/api/playlists?search=a&sort=name")
        self.assertEqual([p["name"] for p in r.json["items"]], ["Alpha", "Beta", "Gamma"])
        self.assertEqual(self.client.get("/api/playlists?search=bet").json["total"], 1)

    def test_invalid_page_is_400(self):
        self.assertEqual(self.client.get("/api/playlists?page=abc").status_code, 400)

    def test_name_is_sanitized_to_stay_in_playlist_folder(self):
        r = self.save("Start", [], new_name="../../escape")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([p.name for p in self.playlists.iterdir()], ["escape.m3u8"])

    def test_name_without_valid_characters_is_400(self):
        self.assertEqual(self.save("...", []).status_code, 400)

    def test_rename_keeps_tracks_and_removes_old_file(self):
        self.save("Old", ["Guns N' Roses/02 - Track.flac"])
        r = self.save("Old", ["Guns N' Roses/02 - Track.flac"], new_name="New")
        self.assertEqual(r.json["name"], "New")
        self.assertFalse((self.playlists / "Old.m3u8").exists())
        self.assertTrue((self.playlists / "New.m3u8").exists())

    def test_rename_does_not_delete_old_file_if_write_fails(self):
        self.save("Keep", ["Guns N' Roses/02 - Track.flac"])
        with mock.patch.object(app_module, "write_playlist", side_effect=OSError("disk full")):
            r = self.save("Keep", [], new_name="Other")
        self.assertEqual(r.status_code, 500)
        self.assertTrue((self.playlists / "Keep.m3u8").exists())

    def test_save_rejects_tracks_outside_music_root(self):
        # Entries are relative to the playlist folder, so one leading "../" is the music root itself
        for bad in ("/etc/passwd", "../../music-private/secret.mp3", "../../etc/passwd", "a/../../music-private/x"):
            with self.subTest(bad=bad):
                self.assertEqual(self.save("Bad", [bad]).status_code, 400)
        self.assertFalse((self.playlists / "Bad.m3u8").exists())

    def test_save_rejects_line_breaks_and_non_strings(self):
        self.assertEqual(self.save("Bad", ["a.mp3\n#EXTINF"]).status_code, 400)
        self.assertEqual(self.save("Bad", [42]).status_code, 400)
        self.assertEqual(self.client.put("/api/playlist/Bad", json={"tracks": "x"}).status_code, 400)

    def test_save_without_json_body_creates_empty_playlist(self):
        r = self.client.put("/api/playlist/Empty", data="not json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json["tracks"], 0)

    def test_delete_and_bulk_delete(self):
        for n in ("One", "Two", "Three"):
            self.save(n, [])
        self.assertEqual(self.client.delete("/api/playlist/One").json["status"], "deleted")
        r = self.client.delete("/api/playlists", json={"names": ["Two", "Missing", "..."]})
        self.assertEqual(r.json["deleted"], ["Two"])
        self.assertEqual(r.json["total_errors"], 2)
        self.assertEqual(sorted(p.name for p in self.playlists.iterdir()), ["Three.m3u8"])

    def test_bulk_delete_requires_names(self):
        self.assertEqual(self.client.delete("/api/playlists", data="x").status_code, 400)


class TestTracks(AppTestCase):
    def write_raw(self, name, lines):
        (self.playlists / f"{name}.m3u8").write_text("#EXTM3U\n" + "".join(f"{x}\n" for x in lines), encoding="utf-8")

    def test_validate_reports_missing_and_outside_tracks(self):
        self.write_raw("V", ["../Guns N' Roses/02 - Track.flac", "../Nope.mp3", "../../music-private/secret.mp3"])
        r = self.client.get("/api/playlist/V/validate").json
        self.assertEqual(r["total_tracks"], 3)
        self.assertEqual(r["missing"], ["Nope.mp3", "../music-private/secret.mp3"])

    def test_download_zips_only_tracks_inside_music_root(self):
        self.write_raw("D", ["../Guns N' Roses/02 - Track.flac", "../../music-private/secret.mp3", "/etc/passwd"])
        r = self.client.get("/api/playlist/D/download")
        self.assertEqual(r.status_code, 200)
        names = zipfile.ZipFile(BytesIO(r.data)).namelist()
        self.assertEqual(names, ["Guns N' Roses/02 - Track.flac"])

    def test_download_missing_playlist_is_404(self):
        self.assertEqual(self.client.get("/api/playlist/None/download").status_code, 404)


class TestMusicBrowser(AppTestCase):
    def test_browse_root_lists_dirs_first_and_strips_guid(self):
        items = self.client.get("/api/music").json["items"]
        self.assertEqual([i["display"] for i in items], ["Artist", "Guns N' Roses"])
        self.assertTrue(all(i["is_dir"] for i in items))

    def test_browse_filters_non_audio_files(self):
        path = "Artist (12345678-1234-5678-9012-345678901234)/Album"
        names = [i["name"] for i in self.client.get("/api/music", query_string={"path": path}).json["items"]]
        self.assertEqual(names, ["01 - Song.mp3"])

    def test_browse_rejects_paths_outside_music_root(self):
        for bad in ("..", "../music-private", "/etc", "Guns N' Roses/../../music-private"):
            with self.subTest(bad=bad):
                r = self.client.get("/api/music", query_string={"path": bad})
                self.assertEqual(r.status_code, 400)

    def test_browse_rejects_symlink_out_of_music_root(self):
        os.symlink(Path(self.tmp.name) / "music-private", self.music / "link")
        self.assertEqual(self.client.get("/api/music", query_string={"path": "link"}).status_code, 400)
        r = self.client.get("/api/dir_recursive", query_string={"path": "link"})
        self.assertEqual(r.status_code, 400)

    def test_browse_missing_folder_is_404(self):
        self.assertEqual(self.client.get("/api/music", query_string={"path": "Nope"}).status_code, 404)

    def test_dir_recursive_returns_sorted_audio_paths(self):
        r = self.client.get("/api/dir_recursive").json
        self.assertEqual(
            r,
            [
                "Artist (12345678-1234-5678-9012-345678901234)/Album/01 - Song.mp3",
                "Guns N' Roses/02 - Track.flac",
            ],
        )

    def test_dir_recursive_rejects_escape(self):
        r = self.client.get("/api/dir_recursive", query_string={"path": "../music-private"})
        self.assertEqual(r.status_code, 400)


class TestPages(AppTestCase):
    def test_index_and_health(self):
        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/health").json, {"status": "healthy"})

    def test_unknown_route_is_json_404(self):
        r = self.client.get("/editor")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json["status_code"], 404)


if __name__ == "__main__":
    unittest.main()
