@echo off
if not exist %1 (
	fsutil file createnew %1 0 >/nul
)