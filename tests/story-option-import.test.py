from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / 'tools' / 'import_story_from_excel.py'


def load_module():
    spec = importlib.util.spec_from_file_location('story_importer', MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Unable to load module: {MODULE_PATH}')

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def assert_equal(actual, expected, message: str) -> None:
    if actual != expected:
        raise AssertionError(f'{message}\nExpected: {expected!r}\nActual:   {actual!r}')


def main() -> int:
    module = load_module()

    single_numbered = module.get_option_choices(module.SUPPLEMENT_TYPE_OPTION, '1-继续')
    assert_equal(
        single_numbered,
        [{'id': '1', 'label': '继续', 'jump': 1}],
        'Type 8 should accept a single numbered option.'
    )

    single_plain = module.get_option_choices(module.SUPPLEMENT_TYPE_OPTION, '继续')
    assert_equal(
        single_plain,
        [{'id': '1', 'label': '继续', 'jump': 1}],
        'Type 8 should accept a single plain-text option.'
    )

    multi_choice = module.get_option_choices(module.SUPPLEMENT_TYPE_OPTION, '1-查看伤口 / 2-带它回家')
    assert_equal(
        multi_choice,
        [
            {'id': '1', 'label': '查看伤口', 'jump': 1},
            {'id': '2', 'label': '带它回家', 'jump': 2},
        ],
        'Type 8 should keep the existing multi-choice format working.'
    )

    print('story-option-import.test.py passed')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
