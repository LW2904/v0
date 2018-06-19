#include "stdafx.h"
#include <thread>
#include <string>
#include <iostream>
#include <Windows.h>

using namespace std;

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

int main()
{
	bool ignore = true;
	for (string line; getline(cin, line);) {
		if (line.compare("[HitObjects]"))
			ignore = false;
		
	}

	return 0;
}

