#!/bin/bash
kill -9 `lsof -i :3001 | grep node | sed -e 's/.*node\(.*\)James.*/\1/' | head -1 | sed 's/^[ \t]*//;s/[ \t]*$//'` || true