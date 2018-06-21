#include "stdafx.h"
#include <thread>
#include <iostream>
#include <windows.h>
#include <tlhelp32.h>

#define TIME_SIGNATURE "\xDB\x5D\xE8\x8B\x45\xE8\xA3"

using namespace std;

DWORD time_addr = NULL;
HANDLE game_proc = NULL;
DWORD game_proc_id = NULL;

bool keypress(int vkey, int duration = 0, int delay = 50)
{
	INPUT ip;
	short evts = 0;

	ip.type = INPUT_KEYBOARD;

	ip.ki.time = 0;
	ip.ki.wScan = 0;
	ip.ki.dwExtraInfo = 0;

	ip.ki.wVk = vkey;

	ip.ki.dwFlags = 0; // Key down.
	evts += SendInput(1, &ip, sizeof INPUT);

	int slp = duration + delay;
	if (slp > 0)
		Sleep(slp);

	ip.ki.dwFlags = KEYEVENTF_KEYUP; // Key up.
	evts -= SendInput(1, &ip, sizeof INPUT);

	return evts == 0;
}

DWORD get_process_id() {
	DWORD process_id = NULL;

	HANDLE process_list = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, NULL);

	PROCESSENTRY32 entry = { 0 };
	entry.dwSize = sizeof PROCESSENTRY32;

	if (Process32First(process_list, &entry)) {
		while (Process32Next(process_list, &entry)) {
			if (_wcsicmp(entry.szExeFile, L"osu!.exe") == 0) {
				process_id = entry.th32ProcessID;
			}
		}
	}

	CloseHandle(process_list);

	return process_id;
}

DWORD FindPattern(HANDLE process, unsigned char pattern[]) {
	const size_t signature_size = sizeof(pattern);
	const size_t read_size = 4096;
	bool hit = false;

	unsigned char chunk[read_size];

	for (size_t i = 0; i < INT_MAX; i += read_size - signature_size) {
		ReadProcessMemory(process, LPCVOID(i), &chunk, read_size, NULL);

		for (size_t a = 0; a < read_size; a++) {
			hit = true;

			for (size_t j = 0; j < signature_size && hit; j++) {
				if (chunk[a + j] != pattern[j]) {
					hit = false;
				}
			}

			if (hit) {
				return i + a;
			}
		}
	}

	return NULL;
}

int32_t get_elapsed_time() {
	int32_t current_time = NULL;

	if (!ReadProcessMemory(game_proc, LPCVOID(time_addr), &current_time, sizeof int32_t, nullptr)) {
		return false;
	}

	return current_time;
};

DWORD find_time_address() {
	DWORD time_ptr = FindPattern(game_proc, PBYTE(TIME_SIGNATURE)) + 7;
	DWORD time_address = NULL;

	if (!ReadProcessMemory(game_proc, LPCVOID(time_ptr), &time_address, sizeof DWORD, nullptr)) {
		return false;
	}

	return time_address;
};

int main()
{
	cout << "started" << endl;

	game_proc_id = get_process_id();

	if (!game_proc_id) {
		cerr << "error: failed to find osu! process" << endl;
		return EXIT_FAILURE;
	}

	game_proc = OpenProcess(PROCESS_VM_READ, false, game_proc_id);

	if (!game_proc) {
		cerr << "error: failed to open handle to osu! process ('" << GetLastError();
		cerr << "')" << endl;
		return EXIT_FAILURE;
	}

	time_addr = find_time_address();

	if (!time_addr) {
		cerr << "error: failed to find pointer to time address ('" << GetLastError();
		cerr << "')" << endl;
		return EXIT_FAILURE;
	}

	while (true) {
		int32_t time = get_elapsed_time();

		cout << "time: ";
		cout << time << endl;

		this_thread::sleep_for(chrono::seconds(1));
	}

	return 0;
}

