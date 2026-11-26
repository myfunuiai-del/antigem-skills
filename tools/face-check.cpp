#include <opencv2/xobjdetect.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc.hpp>
#include <iostream>
#include <string>
#include <vector>

static const char* FRONTAL_CASCADE =
    "/data/data/ai.antigem/files/usr/share/opencv5/haarcascades/haarcascade_frontalface_default.xml";
static const char* PROFILE_CASCADE =
    "/data/data/ai.antigem/files/usr/share/opencv5/haarcascades/haarcascade_profileface.xml";

bool has_face(cv::CascadeClassifier& frontal, cv::CascadeClassifier& profile, bool has_profile, const std::string& path) {
    cv::Mat img = cv::imread(path, cv::IMREAD_GRAYSCALE);
    if (img.empty()) return false;

    if (img.cols > 480) {
        double scale = 480.0 / img.cols;
        cv::resize(img, img, cv::Size(480, std::max(1, int(img.rows * scale))), 0, 0, cv::INTER_AREA);
    }
    cv::equalizeHist(img, img);

    std::vector<cv::Rect> faces;
    frontal.detectMultiScale(img, faces, 1.15, 4, 0, cv::Size(20, 20));
    if (!faces.empty()) return true;

    if (has_profile) {
        profile.detectMultiScale(img, faces, 1.15, 4, 0, cv::Size(20, 20));
        if (!faces.empty()) return true;
        cv::Mat flipped;
        cv::flip(img, flipped, 1);
        profile.detectMultiScale(flipped, faces, 1.15, 4, 0, cv::Size(20, 20));
        if (!faces.empty()) return true;
    }
    return false;
}

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: face-check <img1> [img2...] | --stdin\n";
        return 1;
    }

    cv::CascadeClassifier frontal, profile;
    if (!frontal.load(FRONTAL_CASCADE)) {
        std::cerr << "face-check: failed to load frontal cascade\n";
        return 2;
    }
    bool has_profile = profile.load(PROFILE_CASCADE);

    if (std::string(argv[1]) == "--stdin") {
        std::string line;
        while (std::getline(std::cin, line)) {
            if (line.empty()) continue;
            std::cout << (has_face(frontal, profile, has_profile, line) ? "FACE " : "NONE ") << line << "\n";
        }
    } else {
        for (int i = 1; i < argc; ++i) {
            std::string p = argv[i];
            std::cout << (has_face(frontal, profile, has_profile, p) ? "FACE " : "NONE ") << p << "\n";
        }
    }
    return 0;
}
