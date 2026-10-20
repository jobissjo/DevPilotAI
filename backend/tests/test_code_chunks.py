from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from app.services.code_chunker import chunk_documents
from app.services.core_loader import load_source_documents


class CodeChunkTests(unittest.TestCase):
    def test_chunks_keep_file_and_exact_line_ranges(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "src" / "example.py"
            source.parent.mkdir()
            content = "".join(f"value_{number} = {number}\n" for number in range(150))
            source.write_text(content, encoding="utf-8")
            ignored = root / "node_modules" / "ignored.py"
            ignored.parent.mkdir()
            ignored.write_text("hidden = True\n", encoding="utf-8")

            documents = list(load_source_documents(root))
            self.assertEqual(len(documents), 1)
            chunks = chunk_documents(documents)

        self.assertGreater(len(chunks), 1)
        for chunk in chunks:
            with self.subTest(start=chunk.metadata["start_index"]):
                start = chunk.metadata["start_index"]
                end = start + len(chunk.page_content)
                self.assertEqual(chunk.metadata["source"], "src/example.py")
                self.assertEqual(chunk.page_content, content[start:end])
                self.assertEqual(chunk.metadata["start_line"], content.count("\n", 0, start) + 1)
                self.assertEqual(
                    chunk.metadata["end_line"],
                    content.count("\n", 0, max(start, end - 1)) + 1,
                )
