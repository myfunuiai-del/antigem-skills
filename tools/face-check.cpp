#include <opencv2/xobjdetect.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc.hpp>
#include <iostream>
#include <string>
#include <vector>

static const char* CASCADE_PATH =
    "/data/data/ai.antigem/files/usr/share/opencv5/haarcascades/haarcascade_frontalface_default.xml";

bool has_face(cv::CascadeClassifier& cascade, const std::string& path) {
    cv::Mat img = cv::imread(path, cv::IMREAD_GRAYSCALE);
    if (img.empty()) return false;

    if (img.cols > 320) {
        double scale = 320.0 / img.cols;
        cv::resize(img, img, cv::Size(320, std::max(1, int(img.rows * scale))), 0, 0, cv::INTER_AREA);
    }
    cv::equalizeHist(img, img);

    std::vector<cv::Rect> faces;
    cascade.detectMultiScale(img, faces, 1.15, 4, 0, cv::Size(24, 24));
    return !faces.empty();
}

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cerr << "Usage: face-check <img1> [img2...] | --stdin\n";
        return 1;
    }

    cv::CascadeClassifier cascade;
    if (!cascade.load(CASCADE_PATH)) {
        std::cerr << "face-check: failed to load cascade\n";
        return 2;
    }

    if (std::string(argv[1]) == "--stdin") {
        std::string line;
        while (std::getline(std::cin, line)) {
            if (line.empty()) continue;
            std::cout << (has_face(cascade, line) ? "FACE " : "NONE ") << line << "\n";
        }
    } else {
        for (int i = 1; i < argc; ++i) {
            std::string p = argv[i];
            std::cout << (has_face(cascade, p) ? "FACE " : "NONE ") << p << "\n";
        }
    }
    return 0;
}
